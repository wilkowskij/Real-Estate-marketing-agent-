import { describe, it, expect } from "vitest";
import { normalizeListing, parseSearchInput } from "./rentcast";

describe("normalizeListing", () => {
  it("maps RentCast fields to our shape", () => {
    const l = normalizeListing({
      id: "abc",
      addressLine1: "14 Riverside Ave",
      formattedAddress: "14 Riverside Ave, Red Bank, NJ 07701",
      city: "Red Bank",
      state: "NJ",
      zipCode: "07701",
      price: 1250000,
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2600,
      propertyType: "Single Family",
      status: "Active",
      daysOnMarket: 12,
      listedDate: "2026-05-01",
    });
    expect(l).toMatchObject({
      id: "abc", address: "14 Riverside Ave", town: "Red Bank", state: "NJ",
      zip: "07701", price: 1250000, beds: 4, baths: 3, sqft: 2600, status: "Active",
    });
  });

  it("falls back to formattedAddress and coerces missing fields to null", () => {
    const l = normalizeListing({ formattedAddress: "5 Main St, Holmdel, NJ", price: "n/a" });
    expect(l.address).toBe("5 Main St, Holmdel, NJ");
    expect(l.price).toBeNull();
    expect(l.beds).toBeNull();
  });
});

describe("parseSearchInput", () => {
  it("detects a ZIP", () => {
    expect(parseSearchInput("07701")).toEqual({ zipCode: "07701" });
  });
  it("splits City, ST", () => {
    expect(parseSearchInput("Red Bank, nj")).toEqual({ city: "Red Bank", state: "NJ" });
  });
  it("defaults the state for a bare city", () => {
    expect(parseSearchInput("Asbury Park")).toEqual({ city: "Asbury Park", state: "NJ" });
  });
  it("treats a leading number as an address", () => {
    expect(parseSearchInput("14 Riverside Ave")).toEqual({ address: "14 Riverside Ave" });
  });
});
