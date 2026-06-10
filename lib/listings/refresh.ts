import type { SupabaseClient } from "@supabase/supabase-js";
import { searchSaleListings, type RentcastListing } from "@/lib/listings/rentcast";

/** The saved-listing fields we need to look one up and refresh it. */
export interface RefreshableListing {
  id: string;
  address: string;
  mls_number: string | null;
}

export interface RefreshResult {
  id: string;
  ok: boolean;
  changed?: boolean;
  status?: string;
  price?: number | null;
  error?: string;
}

/** Map a RentCast status to our `listing_status` enum. */
function mapStatus(rc: string | null): "active" | "sold" {
  return rc === "Inactive" ? "sold" : "active";
}

/** Pick the RentCast row that best matches a saved listing. */
function bestMatch(rows: RentcastListing[], listing: RefreshableListing): RentcastListing | null {
  if (rows.length === 0) return null;
  if (listing.mls_number) {
    const byId = rows.find((r) => r.id === listing.mls_number);
    if (byId) return byId;
  }
  const addr = listing.address.trim().toLowerCase();
  const byAddr = rows.find((r) => r.address.trim().toLowerCase() === addr);
  return byAddr ?? rows[0];
}

/**
 * Re-pull one saved listing from RentCast (by address) and update its price +
 * status. Searches Active first, then Inactive so a home that has since sold is
 * detected. Always stamps `last_synced_at`. Best-effort: returns ok:false rather
 * than throwing so a batch can continue.
 */
export async function refreshListingRow(
  supabase: SupabaseClient,
  listing: RefreshableListing
): Promise<RefreshResult> {
  try {
    if (!listing.address?.trim()) return { id: listing.id, ok: false, error: "no address" };

    let rows = await searchSaleListings({ address: listing.address, status: "Active" });
    let match = bestMatch(rows, listing);
    if (!match) {
      rows = await searchSaleListings({ address: listing.address, status: "Inactive" });
      match = bestMatch(rows, listing);
    }

    const now = new Date().toISOString();
    if (!match) {
      // Couldn't find it now; still record that we tried.
      await supabase.from("listings").update({ last_synced_at: now }).eq("id", listing.id);
      return { id: listing.id, ok: true, changed: false };
    }

    const status = mapStatus(match.status);
    const price = match.price;
    const { data } = await supabase
      .from("listings")
      .update({ price, status, last_synced_at: now })
      .eq("id", listing.id)
      .select("price, status")
      .single();

    return { id: listing.id, ok: true, changed: true, status: data?.status ?? status, price: data?.price ?? price };
  } catch (e: any) {
    return { id: listing.id, ok: false, error: e?.message ?? "refresh failed" };
  }
}
