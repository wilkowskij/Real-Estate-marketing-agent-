import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { isRentcastConfigured } from "@/lib/listings/rentcast";
import { refreshListingRow } from "@/lib/listings/refresh";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Manually refresh one saved listing's price/status from the MLS. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRentcastConfigured()) {
    return NextResponse.json({ error: "MLS lookup isn't set up." }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  // RLS confines this select to the caller's org.
  const { data: listing } = await supabase
    .from("listings")
    .select("id, address, mls_number")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const result = await refreshListingRow(supabase, listing);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Refresh failed" }, { status: 502 });
  return NextResponse.json(result);
}
