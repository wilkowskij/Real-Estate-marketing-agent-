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
    .select("id, org_id, kind, config")
    .eq("enabled", true);

  let drafted = 0;
  for (const job of jobs ?? []) {
    const area = (job.config as any)?.area ?? "Monmouth County, NJ";
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
    drafted++;

    await supabase
      .from("recurring_jobs")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", job.id);
  }

  return NextResponse.json({ ok: true, jobs: jobs?.length ?? 0, drafted });
}
