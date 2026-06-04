import { describe, it, expect } from "vitest";
import {
  DEFAULT_MARKET_AREA,
  areaLabel,
  localTermsFor,
  normalizeMarketArea,
  stateName,
} from "./marketArea";

describe("marketArea helpers", () => {
  it("labels an area as 'County County, ST'", () => {
    expect(areaLabel({ state: "TX", county: "Travis", towns: [] })).toBe("Travis County, TX");
  });

  it("resolves full state names", () => {
    expect(stateName("nj")).toBe("New Jersey");
    expect(stateName("TX")).toBe("Texas");
  });

  it("normalizes partial/empty input to the default", () => {
    expect(normalizeMarketArea(null)).toEqual(DEFAULT_MARKET_AREA);
    expect(normalizeMarketArea({})).toEqual(DEFAULT_MARKET_AREA);
  });

  it("uppercases the state and trims towns", () => {
    const a = normalizeMarketArea({ state: "tx", county: "Travis", towns: [" Austin ", ""] });
    expect(a.state).toBe("TX");
    expect(a.towns).toEqual(["Austin"]);
  });

  it("carries the MLS through (trimmed), or drops it when blank", () => {
    expect(
      normalizeMarketArea({ state: "NJ", county: "Monmouth", towns: [], mls: "  MOMLS  " }).mls
    ).toBe("MOMLS");
    expect(
      normalizeMarketArea({ state: "NJ", county: "Monmouth", towns: [], mls: "   " }).mls
    ).toBeUndefined();
  });

  it("builds local signal terms from the chosen market", () => {
    const terms = localTermsFor({ state: "TX", county: "Travis", region: "Hill Country", towns: ["Austin"] });
    expect(terms).toContain("travis");
    expect(terms).toContain("travis county");
    expect(terms).toContain("texas");
    expect(terms).toContain("hill country");
    expect(terms).toContain("austin");
  });
});
