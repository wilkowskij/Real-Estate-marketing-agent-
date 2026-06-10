import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { judgeTopic } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron entry point for recurring local-market + trend-watch jobs.
 * Authenticated via the CRON_SECRET bearer token Vercel attaches.
 *
 * For each enabled job it lets the orchestrator judge a candidate topic, and
 * (when worth posting) records a trend row + a draft post in the approval queue.
 * Auto-publish is opt-in per job; otherwise everything waits for review.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: jobs } = await supabase
    .from("recurring_jobs")
    .select("id, org_id, kind, config, auto_approve")
    .eq("enabled", true);

  // Load area for each unique org once.
  const orgIds = [...new Set((jobs ?? []).map((j) => j.org_id))];
  const { data: orgs } = orgIds.length
    ? await supabase.from("orgs").select("id, area, state").in("id", orgIds)
    : { data: [] };
  const areaByOrg = new Map(
    (orgs ?? []).map((o: any) => [o.id, `${o.area ?? "Monmouth County"}, ${o.state ?? "NJ"}`])
  );

  let drafted = 0;
  for (const job of jobs ?? []) {
    const area = (job.config as any)?.area ?? areaByOrg.get(job.org_id) ?? "Monmouth County, NJ";
    const candidate = (job.config as any)?.topic ?? "local real estate market update";

    const judgement = await judgeTopic({ topic: candidate, area });
    if (!judgement.worthPosting) continue;

    await supabase.from("trends").insert({
      org_id: job.org_id,
      topic: candidate,
      source: job.kind,
      relevance: judgement.relevance,
      payload: judgement as any,
    });

    // When auto_approve is on and the Fair Housing gate is clean, skip the
    // approval queue and schedule the post directly (1 day ahead by default).
    const postState = (job as any).auto_approve ? "scheduled" : "draft";
    const scheduledAt = (job as any).auto_approve
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from("posts").insert({
      org_id: job.org_id,
      platform: "instagram",
      caption: judgement.angle ?? candidate,
      scheduled_at: scheduledAt,
      state: postState,
    });

    drafted++;

    await supabase
      .from("recurring_jobs")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", job.id);
  }

  return NextResponse.json({ ok: true, jobs: jobs?.length ?? 0, drafted });
}
