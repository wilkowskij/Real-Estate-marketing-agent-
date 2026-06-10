import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/pull-metrics
 *
 * Phase 2 placeholder: fetches published posts that have a platform_post_id
 * and would call the Meta Graph API / LinkedIn Organization Analytics API to
 * pull engagement metrics into the social_metrics table.
 *
 * Currently logs which posts would be processed. Wires up to real API calls
 * once Meta/LinkedIn app review is approved (pending external process).
 *
 * Scheduled via vercel.json cron: "0 7 * * *" (daily at 07:00 UTC).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  // Find published posts that have a platform ID (meaning they actually went live)
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, org_id, platform, platform_post_id, scheduled_at")
    .eq("state", "published")
    .not("platform_post_id", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[pull-metrics] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = posts ?? [];
  console.log(`[pull-metrics] ${candidates.length} published posts eligible for metric pull`);

  // ── Phase 2 TODO ──────────────────────────────────────────────────────────
  // For each post, call the appropriate platform API:
  //
  // Instagram / Facebook (Meta Graph API):
  //   GET /{platform_post_id}/insights?metric=impressions,reach,likes,comments,shares
  //   Requires: ig_media_id or fb_post_id + pages_read_engagement permission
  //
  // LinkedIn:
  //   GET /v2/organizationalEntityShareStatistics?organizationalEntity=urn:li:organization:{id}
  //   Requires: r_organization_social permission
  //
  // X (Twitter):
  //   GET /2/tweets/{id}?tweet.fields=public_metrics
  //   Requires: tweet.read scope
  //
  // Once fetched, upsert into social_metrics:
  //   supabase.from("social_metrics").upsert([
  //     { org_id, post_id, platform, metric: "impressions", value, captured_at: new Date() },
  //     { org_id, post_id, platform, metric: "reach",       value, captured_at: new Date() },
  //     ...
  //   ], { onConflict: "post_id,platform,metric,captured_at" });
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({
    ok: true,
    eligible: candidates.length,
    status: "Phase 2 pending — awaiting Meta/LinkedIn app review",
  });
}
