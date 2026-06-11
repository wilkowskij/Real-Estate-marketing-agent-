import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const CreateBody = z.object({
  title: z.string().min(1).max(140),
  kind: z.enum(["general", "open_house", "listing"]).default("general"),
  headline: z.string().max(200).optional(),
  subhead: z.string().max(400).optional(),
  listingId: z.string().uuid().optional(),
  marketingCampaignId: z.string().uuid().optional(),
  /** Only relevant for open_house forms. Defaults to 'mls'. */
  packetMode: z.enum(["mls", "manual", "pdf"]).default("mls"),
  /** Storage path for an uploaded PDF (packet_mode = 'pdf'). */
  packetPdfPath: z.string().max(500).optional(),
  /** Agent-entered details (packet_mode = 'manual'). */
  packetDetails: z
    .object({
      address: z.string().max(200).optional(),
      town: z.string().max(120).optional(),
      state: z.string().max(40).optional(),
      price: z.number().nonnegative().nullable().optional(),
      beds: z.number().int().nonnegative().nullable().optional(),
      baths: z.number().nonnegative().nullable().optional(),
      sqft: z.number().int().nonnegative().nullable().optional(),
      description: z.string().max(2000).optional(),
    })
    .optional(),
});

/** Turn a title into a URL-safe slug + short random suffix for uniqueness. */
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "form";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lead_forms")
    .select("id, slug, title, kind, headline, subhead, active, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data ?? [] });
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

  const { data, error } = await supabase
    .from("lead_forms")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      slug: slugify(b.title),
      title: b.title,
      kind: b.kind,
      headline: b.headline ?? null,
      subhead: b.subhead ?? null,
      listing_id: b.listingId ?? null,
      marketing_campaign_id: b.marketingCampaignId ?? null,
      packet_mode: b.packetMode,
      packet_pdf_path: b.packetPdfPath ?? null,
      packet_details: b.packetDetails ?? {},
    })
    .select("id, slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, slug: data.slug });
}
