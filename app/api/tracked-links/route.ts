import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const CreateBody = z.object({
  destination: z.string().url().max(2000),
  label: z.string().max(140).optional(),
  marketingCampaignId: z.string().uuid().optional(),
});

function slugify(label: string | undefined): string {
  const base =
    (label ?? "link")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "link";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from("tracked_links")
    .select("id, slug, destination, label, clicks, marketing_campaign_id, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });
  if (campaignId) q = q.eq("marketing_campaign_id", campaignId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid destination URL." }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tracked_links")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      slug: slugify(b.label),
      destination: b.destination,
      label: b.label ?? null,
      marketing_campaign_id: b.marketingCampaignId ?? null,
    })
    .select("id, slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, slug: data.slug });
}
