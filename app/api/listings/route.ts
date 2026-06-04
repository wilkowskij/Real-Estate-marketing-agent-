import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const SELECT =
  "id, address, town, state, county, zip, price, beds, baths, sqft, status, mls_number, source, last_synced_at, created_at";

/** List the org's saved listings, newest first. */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select(SELECT)
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

const SaveBody = z.object({
  address: z.string().min(1).max(200),
  town: z.string().max(120).optional(),
  state: z.string().max(40).optional(),
  zip: z.string().max(12).optional(),
  price: z.number().nonnegative().nullable().optional(),
  beds: z.number().int().nonnegative().nullable().optional(),
  baths: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(["active", "pending", "sold", "coming_soon"]).optional(),
  mlsNumber: z.string().max(60).optional(),
  source: z.enum(["mls", "manual"]).default("manual"),
});

/**
 * Save (or refresh) a listing so it can be reused across campaigns. When an MLS
 * number is supplied and a row already exists for it in this org, the existing
 * row is updated (price/status/sync time) instead of creating a duplicate.
 * State/county default to the agent's configured market area.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SaveBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createSupabaseServerClient();
  const area = ctx.brand.marketArea;

  const row = {
    org_id: ctx.orgId,
    created_by: ctx.userId,
    address: b.address,
    town: b.town ?? null,
    state: (b.state || area.state).toUpperCase().slice(0, 2),
    county: area.county,
    zip: b.zip ?? null,
    price: b.price ?? null,
    beds: b.beds ?? null,
    baths: b.baths ?? null,
    sqft: b.sqft ?? null,
    status: b.status ?? "active",
    mls_number: b.mlsNumber ?? null,
    source: b.source,
    last_synced_at: b.source === "mls" ? new Date().toISOString() : null,
  };

  // Dedupe MLS saves by (org, mls_number): update the existing row if present.
  if (b.mlsNumber) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("org_id", ctx.orgId)
      .eq("mls_number", b.mlsNumber)
      .maybeSingle();
    if (existing) {
      const { created_by: _omit, org_id: _omit2, ...update } = row;
      const { data, error } = await supabase
        .from("listings")
        .update(update)
        .eq("id", existing.id)
        .select(SELECT)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ listing: data, saved: true, deduped: true });
    }
  }

  const { data, error } = await supabase.from("listings").insert(row).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listing: data, saved: true });
}
