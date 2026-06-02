import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { planContentCalendar } from "@/lib/agents/calendar";
import { MODEL, estimateCostUsd } from "@/lib/anthropic/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  /** Number of posts to plan (default 20 ≈ a month at ~5/week). */
  count: z.number().int().min(4).max(40).optional(),
  /** ISO date to start from (default: today). */
  start: z.string().datetime().optional(),
  area: z.string().optional(),
  /** Relative per-bucket weights from the mix-settings sliders (0–100 each). */
  mix: z.record(z.string(), z.number().min(0).max(100)).optional(),
});

/**
 * Generate a content calendar: allocate posts across the content-mix buckets,
 * assign each a local angle (one Claude call), and persist them as draft posts
 * scheduled across the month. The agent then opens each draft to generate full
 * copy + graphics on demand. Nothing auto-publishes.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { posts, usage } = await planContentCalendar({
    count: parsed.data.count ?? 20,
    start: parsed.data.start ? new Date(parsed.data.start) : undefined,
    area: parsed.data.area,
    mix: parsed.data.mix,
  });

  const supabase = createSupabaseServerClient();

  // Persist each planned post as a draft. caption holds the angle as a starting
  // point; type/format/bucket are stashed in a meta-prefixed caption-free way via
  // the posts columns we have (platform, scheduled_at, state) — the planning
  // metadata travels in the caption preamble until full copy is generated.
  const rows = posts.map((p) => ({
    org_id: ctx.orgId,
    platform: p.platform,
    caption: `[${p.type} · ${p.format}] ${p.angle}`,
    scheduled_at: p.scheduledAt,
    state: "draft" as const,
  }));

  const { data: inserted, error } = await supabase.from("posts").insert(rows).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort audit of the planning run.
  await supabase.from("agent_runs").insert({
    org_id: ctx.orgId,
    agent: "orchestrator",
    output: { planned: posts.length } as any,
    input_tokens: usage.input,
    output_tokens: usage.output,
    cost_usd: estimateCostUsd(MODEL, usage.input, usage.output),
  });

  return NextResponse.json({ planned: inserted?.length ?? 0, posts });
}
