import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

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
  /** The EmailCopy or SmsCopy object produced by the messaging agent. */
  content: z.record(z.string(), z.any()),
});

/** Save a generated email/SMS piece into a campaign. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  // Confirm the campaign belongs to this org (RLS also enforces this).
  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("campaign_messages")
    .insert({
      org_id: ctx.orgId,
      marketing_campaign_id: params.id,
      created_by: ctx.userId,
      channel: parsed.data.channel,
      campaign_type: parsed.data.type,
      content: parsed.data.content,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
