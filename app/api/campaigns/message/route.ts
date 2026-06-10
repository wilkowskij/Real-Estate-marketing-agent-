import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { runMessagingAgent } from "@/lib/agents/messaging";
import { detectSlopInText } from "@/lib/agents/stopSlop";
import { injectUtmIntoCopy } from "@/lib/utm";
import { MODEL, estimateCostUsd } from "@/lib/anthropic/client";
import { aiCampaignsRemaining, recordUsage } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const maxDuration = 45;

const Body = z.object({
  channel: z.enum(["email", "sms"]),
  type: z.enum([
    "just_sold",
    "new_listing",
    "open_house",
    "market_stat",
    "neighborhood_spotlight",
    "deal_of_week",
    "before_after",
    "educational",
    "testimonial",
    "custom",
  ]),
  listing: z
    .object({
      address: z.string().optional(),
      town: z.string().optional(),
      price: z.number().nullable().optional(),
      beds: z.number().nullable().optional(),
      baths: z.number().nullable().optional(),
      sqft: z.number().nullable().optional(),
    })
    .optional(),
  instructions: z.string().optional(),
  recipientName: z.string().max(80).optional(),
});

/**
 * Generate email or SMS nurture copy (the Messaging Agent). Shares the social
 * Marketing Agent's cached local-expertise system block. Metered against the
 * same monthly AI-generation allowance as social campaigns; runs Stop Slop on
 * the result before returning.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createSupabaseServerClient();

  // Plan gating: email/SMS draw from the same monthly AI-generation allowance.
  const remaining = await aiCampaignsRemaining(supabase, ctx.orgId, ctx.subscription.plan);
  if (remaining !== null && remaining <= 0) {
    return NextResponse.json(
      { error: "You've used your monthly AI campaign allowance. Upgrade your plan for more." },
      { status: 402 }
    );
  }

  let result;
  try {
    result = await runMessagingAgent({
      channel: input.channel,
      type: input.type,
      listing: input.listing,
      instructions: input.instructions,
      agentName: ctx.profile?.full_name ?? undefined,
      recipientName: input.recipientName,
      area: ctx.orgArea,
      brandVoice: ctx.brandVoice,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Generation failed" }, { status: 502 });
  }

  // Meter + audit (best-effort).
  await recordUsage(supabase, ctx.orgId, "ai_generation", 1, {
    channel: input.channel,
    type: input.type,
  });
  await supabase.from("agent_runs").insert({
    org_id: ctx.orgId,
    agent: "marketing",
    output: result.copy as any,
    input_tokens: result.usage.input,
    output_tokens: result.usage.output,
    cost_usd: estimateCostUsd(MODEL, result.usage.input, result.usage.output),
  });

  // Inject UTM params into any links in the copy (email body/CTA, SMS message).
  const trackedCopy = injectUtmIntoCopy(result.copy as any, { source: result.channel, medium: "direct" });

  // Stop Slop — SMS is too short to demand local terms, so only require local
  // specificity on email.
  const scanText =
    result.channel === "email"
      ? `${(trackedCopy as any).subject ?? ""} ${(trackedCopy as any).body ?? ""} ${(trackedCopy as any).cta ?? ""}`
      : (trackedCopy as any).message ?? "";
  const slop = detectSlopInText(scanText, { requireLocal: result.channel === "email", area: ctx.orgArea });

  return NextResponse.json({
    channel: result.channel,
    copy: trackedCopy,
    slopIssues: slop.clean ? [] : slop.issues,
  });
}
