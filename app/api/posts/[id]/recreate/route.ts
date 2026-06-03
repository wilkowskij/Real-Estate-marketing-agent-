import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { generateAngle } from "@/lib/agents/calendar";
import { MODEL, estimateCostUsd } from "@/lib/anthropic/client";
import type { CampaignType, PostFormat } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const TYPES = new Set<CampaignType>([
  "just_sold", "new_listing", "open_house", "market_stat", "neighborhood_spotlight",
  "deal_of_week", "before_after", "educational", "testimonial", "custom",
]);
const FORMATS = new Set<PostFormat>(["reel", "carousel", "infographic", "single_image"]);

/**
 * Recreate a planned post's angle/hook — a fresh one-line idea for the same
 * content type + format. The planner stores the type/format in the caption
 * preamble "[type · format] angle", so we parse it back out and regenerate.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, caption")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse "[type · format] ..." preamble; fall back to sensible defaults.
  const m = (post.caption ?? "").match(/^\[([a-z_]+)\s*·\s*([a-z_]+)\]/i);
  const type = (m && TYPES.has(m[1] as CampaignType) ? m[1] : "custom") as CampaignType;
  const format = (m && FORMATS.has(m[2] as PostFormat) ? m[2] : "single_image") as PostFormat;

  let angle: string;
  let usage: { input: number; output: number };
  try {
    ({ angle, usage } = await generateAngle({ type, format }));
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not recreate" }, { status: 502 });
  }

  const caption = `[${type} · ${format}] ${angle}`;
  const { error } = await supabase
    .from("posts")
    .update({ caption })
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("agent_runs").insert({
    org_id: ctx.orgId,
    agent: "orchestrator",
    output: { recreated: params.id } as any,
    input_tokens: usage.input,
    output_tokens: usage.output,
    cost_usd: estimateCostUsd(MODEL, usage.input, usage.output),
  });

  return NextResponse.json({ ok: true, caption });
}
