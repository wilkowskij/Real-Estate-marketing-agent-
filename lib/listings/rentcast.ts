/**
 * RentCast MLS/listing data. Pulls active sale (and sold) listings so an agent
 * can pick a property and have the campaign fields filled in automatically —
 * turning campaign creation into ~2 clicks.
 *
 * API: https://api.rentcast.io/v1  (header `X-Api-Key`). The key stays
 * server-side; the browser only ever talks to our /api/listings/search proxy.
 *
 * Note: RentCast returns property facts (address, beds/baths, sqft, price,
 * status, days-on-market) but generally NOT MLS photos (licensing), so the
 * agent still uploads photos or uses the AI-image path.
 */

const BASE = "https://api.rentcast.io/v1";

export function isRentcastConfigured(): boolean {
  return Boolean(process.env.RENTCAST_API_KEY);
}

export interface RentcastListing {
  id: string;
  address: string;
  town: string | null;
  state: string | null;
  zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string | null;
  /** "Active" | "Inactive" (sold/off-market) per RentCast. */
  status: string | null;
  daysOnMarket: number | null;
  listedDate: string | null;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && isFinite(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Normalize one raw RentCast listing record. Exported for unit testing. */
export function normalizeListing(raw: any): RentcastListing {
  return {
    id: String(raw?.id ?? raw?.mlsNumber ?? raw?.formattedAddress ?? crypto.randomUUID()),
    address: str(raw?.addressLine1) ?? str(raw?.formattedAddress) ?? "",
    town: str(raw?.city),
    state: str(raw?.state),
    zip: str(raw?.zipCode),
    price: num(raw?.price),
    beds: num(raw?.bedrooms),
    baths: num(raw?.bathrooms),
    sqft: num(raw?.squareFootage),
    propertyType: str(raw?.propertyType),
    status: str(raw?.status),
    daysOnMarket: num(raw?.daysOnMarket),
    listedDate: str(raw?.listedDate),
  };
}

export interface ListingSearch {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  /** "Active" (default) or "Inactive" (recently sold / off-market). */
  status?: "Active" | "Inactive";
  limit?: number;
}

/**
 * Search sale listings. Requires at least one location filter (address, city,
 * or zipCode). Throws a readable error when unconfigured or on an API failure.
 */
export async function searchSaleListings(params: ListingSearch): Promise<RentcastListing[]> {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) throw new Error("MLS lookup isn't configured (missing RENTCAST_API_KEY).");
  if (!params.address && !params.city && !params.zipCode) {
    throw new Error("Enter an address, ZIP, or city to search.");
  }

  const q = new URLSearchParams();
  if (params.address) q.set("address", params.address);
  if (params.city) q.set("city", params.city);
  if (params.state) q.set("state", params.state);
  if (params.zipCode) q.set("zipCode", params.zipCode);
  q.set("status", params.status ?? "Active");
  q.set("limit", String(Math.min(Math.max(params.limit ?? 20, 1), 50)));

  const res = await fetch(`${BASE}/listings/sale?${q.toString()}`, {
    headers: { "X-Api-Key": key, Accept: "application/json" },
    // RentCast data is fine to cache briefly; avoids burning the quota on repeats.
    next: { revalidate: 300 },
  } as RequestInit & { next?: { revalidate?: number } });

  if (res.status === 404) return []; // no listings for that query
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MLS lookup failed (${res.status}). ${body.slice(0, 140)}`.trim());
  }

  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data) ? data : Array.isArray(data?.listings) ? data.listings : [];
  return rows.map(normalizeListing).filter((l: RentcastListing) => l.address);
}

/**
 * Parse a single free-text search box into structured params:
 *   "07701"            -> { zipCode }
 *   "Red Bank, NJ"     -> { city, state }
 *   "Red Bank"         -> { city, state: defaultState }
 *   "14 Riverside Ave" -> { address }
 */
export function parseSearchInput(input: string, defaultState = "NJ"): ListingSearch {
  const s = input.trim();
  if (/^\d{5}$/.test(s)) return { zipCode: s };
  if (s.includes(",")) {
    const [city, state] = s.split(",").map((p) => p.trim());
    return { city, state: (state || defaultState).toUpperCase().slice(0, 2) };
  }
  // A leading street number → treat as an address; otherwise a city name.
  if (/^\d/.test(s)) return { address: s };
  return { city: s, state: defaultState };
}
