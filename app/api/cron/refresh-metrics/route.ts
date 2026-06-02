import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getMetricsFetcher, anyLiveFetcher } from "@/lib/social/metrics";
import { decryptToken } from "@/lib/social/crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Snapshot engagement metrics for published posts. Authenticated with the
 * CRON_SECRET bearer token; uses the service-role client to act across orgs and
 * write social_metrics (which has no member-insert RLS policy).
 *
 * While every platform's insights fetcher is still a stub (pending API access),
 * this short-circuits so we don't decrypt tokens or hit storage for nothing.
 * The moment a platform ships a live fetcher, snapshots start flowing.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!anyLiveFetcher()) {
    return NextResponse.json({ skipped: true, reason: "No live insights fetchers yet" });
  }

  const supabase = createSupabaseAdminClient();

  // Published posts that have a platform id we can query insights for.
  const { data: posts } = await supabase
    .from("posts")
    .select("id, org_id, platform, platform_post_id")
    .eq("state", "published")
    .not("platform_post_id", "is", null)
    .limit(500);

  // Cache one connected account's auth per (org, platform).
  const authCache = new Map<string, { accessToken?: string }>();
  async function authFor(orgId: string, platform: string) {
    const key = `${orgId}:${platform}`;
    if (authCache.has(key)) return authCache.get(key)!;
    const { data: acct } = await supabase
      .from("social_accounts")
      .select("access_token_enc, meta")
      .eq("org_id", orgId)
      .eq("platform", platform)
      .limit(1)
      .maybeSingle();
    const resolved = {
      accessToken: acct?.access_token_enc ? decryptToken(acct.access_token_enc) : undefined,
      ...(acct?.meta as object | undefined),
    };
    authCache.set(key, resolved);
    return resolved;
  }

  let written = 0;
  const results: { postId: string; ok: boolean }[] = [];
  for (const p of posts ?? []) {
    const fetcher = getMetricsFetcher(p.platform);
    if (!fetcher.live) continue;
    try {
      const auth = await authFor(p.org_id, p.platform);
      const m = await fetcher.fetch(
        { platform: p.platform, platformPostId: p.platform_post_id as string },
        auth
      );
      if (!m) {
        results.push({ postId: p.id, ok: false });
        continue;
      }
      await supabase.from("social_metrics").insert({
        org_id: p.org_id,
        post_id: p.id,
        platform: p.platform,
        impressions: m.impressions,
        reach: m.reach,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
        clicks: m.clicks,
        video_views: m.videoViews,
        raw: m.raw as any,
      });
      written += 1;
      results.push({ postId: p.id, ok: true });
    } catch {
      results.push({ postId: p.id, ok: false });
    }
  }

  return NextResponse.json({ written, scanned: posts?.length ?? 0, results });
}
