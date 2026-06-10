import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { runMarketingAgent } from "@/lib/agents/marketing";
import { detectSlop } from "@/lib/agents/stopSlop";
import type { CampaignType } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Regenerate just the caption + headline + CTA for an existing post without
 * re-running the full generate flow (no new image, no new design agent call).
 * Reads the post's stored campaign metadata from the caption preamble, runs
 * the marketing agent, PATCHes the caption in place, and returns the new copy.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: post, error: fetchErr } = await supabase
    .from("posts")
    .select("id, caption, state")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (fetchErr || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Decode the campaign type from the caption preamble written by the calendar
  // planner: "[type · format] angle". For manually generated posts the type
  // isn't stored on the post row, so fall back to "custom".
  const typeMatch = post.caption?.match(/^\[(\w+)\s·/);
  const type: CampaignType = (typeMatch?.[1] as CampaignType) ?? "custom";
  const instructions = post.caption?.replace(/^\[.*?\]\s*/, "") ?? undefined;

  let marketing: Awaited<ReturnType<typeof runMarketingAgent>>;
  try {
    marketing = await runMarketingAgent({
      type,
      instructions,
      agentName: ctx.brand.agent.fullName ?? undefined,
      area: ctx.orgArea,
      brandVoice: ctx.brandVoice,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Regeneration failed" }, { status: 502 });
  }

  const newCaption = marketing.copy.caption;
  const { error: updateErr } = await supabase
    .from("posts")
    .update({ caption: newCaption })
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const slop = detectSlop(marketing.copy, { areaLabel: ctx.orgArea });
  return NextResponse.json({
    caption: newCaption,
    copy: marketing.copy,
    slopIssues: slop.clean ? [] : slop.issues,
  });
}
