import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isRentcastConfigured } from "@/lib/listings/rentcast";
import { refreshListingRow } from "@/lib/listings/refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bound cost per run — refresh the most-stale MLS listings each day.
const BATCH = 40;

/**
 * Refresh price/status for saved MLS listings from RentCast. Authenticated with
 * the CRON_SECRET bearer token; service-role client acts across orgs. Picks the
 * most-stale listings (oldest last_synced_at first) so every listing is covered
 * over time without blowing the API quota in one run.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRentcastConfigured()) {
    return NextResponse.json({ skipped: "RENTCAST_API_KEY not set" });
  }

  const supabase = createSupabaseAdminClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, mls_number, last_synced_at")
    .eq("source", "mls")
    .not("mls_number", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);

  const results = [];
  for (const l of listings ?? []) {
    results.push(await refreshListingRow(supabase, l));
  }
  return NextResponse.json({ processed: results.length, results });
}
