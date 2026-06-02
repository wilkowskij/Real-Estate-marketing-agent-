import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const CreateBody = z.object({
  title: z.string().min(1).max(200),
  value: z.number().nonnegative().nullable().optional(),
  /** Convert from an existing lead — inherits its source + campaign attribution. */
  leadId: z.string().uuid().optional(),
  marketingCampaignId: z.string().uuid().optional(),
  stage: z
    .enum(["prospect", "appointment", "agreement", "under_contract", "closed_won", "closed_lost"])
    .optional(),
});

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value, stage, source, marketing_campaign_id, lead_id, closed_at, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createSupabaseServerClient();

  // When converting a lead, snapshot its source + campaign so attribution
  // survives even if the lead is later edited or deleted.
  let source: string | null = null;
  let campaignId: string | null = b.marketingCampaignId ?? null;
  let listingId: string | null = null;
  if (b.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("source, marketing_campaign_id, listing_id")
      .eq("id", b.leadId)
      .eq("org_id", ctx.orgId)
      .maybeSingle();
    if (lead) {
      source = lead.source ?? null;
      campaignId = campaignId ?? lead.marketing_campaign_id ?? null;
      listingId = lead.listing_id ?? null;
    }
  }

  const stage = b.stage ?? "prospect";
  const { data, error } = await supabase
    .from("deals")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      lead_id: b.leadId ?? null,
      marketing_campaign_id: campaignId,
      listing_id: listingId,
      title: b.title,
      value: b.value ?? null,
      stage,
      source,
      closed_at: stage === "closed_won" || stage === "closed_lost" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
