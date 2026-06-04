import type { MarketArea } from "@/lib/supabase/types";

/**
 * Helpers for the market area an org/agent works in. The default keeps the
 * product's original Monmouth County, NJ market so existing accounts see no
 * change; new accounts can pick their own state + county in Brand settings.
 */

export const DEFAULT_MARKET_AREA: MarketArea = {
  state: "NJ",
  county: "Monmouth",
  region: "Jersey Shore",
  towns: [
    "Red Bank",
    "Asbury Park",
    "Middletown",
    "Freehold",
    "Rumson",
    "Fair Haven",
    "Long Branch",
    "Holmdel",
    "Colts Neck",
    "Manasquan",
    "Spring Lake",
    "Belmar",
  ],
};

/** US states + DC, abbreviation → full name. Powers the Brand-settings picker. */
export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** Full state name for a code (falls back to the code itself). */
export function stateName(code: string): string {
  return US_STATES[(code ?? "").toUpperCase()] ?? code;
}

/**
 * Coerce whatever is stored (possibly null/partial on legacy rows) into a
 * complete MarketArea, falling back to the default for any missing piece.
 */
export function normalizeMarketArea(input?: Partial<MarketArea> | null): MarketArea {
  if (!input || typeof input !== "object") return DEFAULT_MARKET_AREA;
  const state = (input.state ?? "").trim();
  const county = (input.county ?? "").trim();
  if (!state && !county) return DEFAULT_MARKET_AREA;
  return {
    state: (state || DEFAULT_MARKET_AREA.state).toUpperCase(),
    county: county || DEFAULT_MARKET_AREA.county,
    region: input.region?.trim() || undefined,
    towns: Array.isArray(input.towns)
      ? input.towns.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };
}

/** Human label, e.g. "Monmouth County, NJ". */
export function areaLabel(area: MarketArea): string {
  return `${area.county} County, ${area.state}`;
}

/**
 * Lowercased signal tokens that mark a piece of copy as genuinely local to this
 * area. Used by Stop Slop: if none appear, the copy is flagged as generic.
 */
export function localTermsFor(area: MarketArea): string[] {
  const terms = new Set<string>();
  const add = (s?: string) => {
    const t = (s ?? "").trim().toLowerCase();
    if (t) terms.add(t);
  };
  add(area.county);
  add(`${area.county} county`);
  add(stateName(area.state)); // full name, e.g. "new jersey" (distinctive)
  add(area.region);
  // Padded abbreviation so a bare "nj" doesn't match inside words like "enjoy".
  if (area.state) terms.add(` ${area.state.toLowerCase()} `);
  for (const town of area.towns) add(town);
  return [...terms];
}
