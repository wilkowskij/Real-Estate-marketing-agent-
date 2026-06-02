import { SupabaseClient } from "@supabase/supabase-js";
import { getActivePublisher } from "./publisher";
import { decryptToken } from "./crypto";
import { signedUrl } from "@/lib/storage";

/**
 * Publish a single post row: resolve the org's connected account for the post's
 * platform, decrypt its token, sign the media URLs, and dispatch to the active
 * publisher (live API if approved+connected, else manual export). Updates the
 * post's state and returns the result.
 *
 * Designed to be called from a route handler OR a cron worker with a
 * service-role client.
 */
export async function publishPost(
  supabase: SupabaseClient,
  postId: string,
  opts: { overrideCompliance?: boolean } = {}
): Promise<{ ok: boolean; state: string; error?: string; platformPostId?: string; exportUrl?: string; complianceNotes?: string[] }> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, org_id, platform, caption, media_paths, state, campaign_id")
    .eq("id", postId)
    .single();
  if (error || !post) return { ok: false, state: "failed", error: "Post not found" };

  // Fair-Housing review gate: if the source campaign flagged compliance notes,
  // do not publish until a human explicitly overrides. Protects the agent's
  // license and keeps non-compliant copy from going live automatically.
  if (post.campaign_id && !opts.overrideCompliance) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("copy")
      .eq("id", post.campaign_id)
      .maybeSingle();
    const notes = (campaign?.copy as { compliance_notes?: unknown })?.compliance_notes;
    const flagged = Array.isArray(notes) ? notes.map(String).filter(Boolean) : [];
    if (flagged.length > 0) {
      return {
        ok: false,
        state: post.state,
        error: "Blocked by Fair-Housing review: resolve or override the compliance notes before publishing.",
        complianceNotes: flagged,
      };
    }
  }

  // Resolve the connected account to post from. Connections are per-person, so
  // prefer the account owned by the member who created the campaign; fall back
  // to any org/member account for the platform (most recently connected).
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("access_token_enc, meta, owner, membership_id")
    .eq("org_id", post.org_id)
    .eq("platform", post.platform)
    .order("created_at", { ascending: false });

  let account = accounts?.[0] ?? null;
  if (accounts?.length && post.campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("created_by")
      .eq("id", post.campaign_id)
      .maybeSingle();
    if (campaign?.created_by) {
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("org_id", post.org_id)
        .eq("user_id", campaign.created_by)
        .maybeSingle();
      const owned = membership
        ? accounts.find((a) => a.membership_id === membership.id)
        : null;
      if (owned) account = owned;
    }
  }

  const mediaUrls = (
    await Promise.all((post.media_paths ?? []).map((p: string) => signedUrl(supabase, p)))
  ).filter((u): u is string => Boolean(u));

  const publisher = getActivePublisher(post.platform);

  // Live publishers need a connected account; manual export does not.
  const auth =
    account && account.access_token_enc
      ? {
          accessToken: decryptToken(account.access_token_enc),
          meta: (account.meta as Record<string, unknown>) ?? {},
        }
      : {};

  if (publisher.live && !account?.access_token_enc) {
    await supabase
      .from("posts")
      .update({ state: "failed", error: `No connected ${post.platform} account.` })
      .eq("id", post.id);
    return { ok: false, state: "failed", error: `No connected ${post.platform} account.` };
  }

  const result = await publisher.publish({ caption: post.caption ?? "", mediaUrls }, auth);

  const state = result.ok ? "published" : "failed";
  await supabase
    .from("posts")
    .update({
      state,
      platform_post_id: result.platformPostId ?? null,
      error: result.error ?? null,
    })
    .eq("id", post.id);

  return {
    ok: result.ok,
    state,
    error: result.error,
    platformPostId: result.platformPostId,
    exportUrl: result.exportUrl,
  };
}
