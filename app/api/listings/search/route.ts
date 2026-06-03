import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";
import { searchSaleListings, parseSearchInput, isRentcastConfigured } from "@/lib/listings/rentcast";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Proxy MLS listing search to RentCast (key stays server-side). Auth-gated so
 * only signed-in agents can pull listings. Query params:
 *   q       free-text (address / ZIP / "City, ST")
 *   status  "Active" (default) | "Inactive" (recently sold)
 */
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRentcastConfigured()) {
    return NextResponse.json(
      { error: "MLS lookup isn't set up yet. Add RENTCAST_API_KEY to enable it.", configured: false },
      { status: 503 }
    );
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "Type an address, ZIP, or city to search." }, { status: 400 });
  }
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam === "Inactive" ? "Inactive" : "Active";

  try {
    const params = { ...parseSearchInput(q), status: status as "Active" | "Inactive" };
    const listings = await searchSaleListings(params);
    return NextResponse.json({ listings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "MLS lookup failed" }, { status: 502 });
  }
}
