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
  postId: string
): Promise<{ ok: boolean; state: string; error?: string; platformPostId?: string; exportUrl?: string }> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, org_id, platform, caption, media_paths, state")
    .eq("id", postId)
    .single();
  if (error || !post) return { ok: false, state: "failed", error: "Post not found" };

  const { data: account } = await supabase
    .from("social_accounts")
    .select("access_token_enc, meta")
    .eq("org_id", post.org_id)
    .eq("platform", post.platform)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
