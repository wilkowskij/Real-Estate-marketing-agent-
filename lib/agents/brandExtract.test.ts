import { describe, it, expect } from "vitest";
import { normalizeHex } from "./brandExtract";

describe("normalizeHex", () => {
  it("accepts a valid 6-digit hex and lowercases it", () => {
    expect(normalizeHex("#C9A96E")).toBe("#c9a96e");
  });

  it("adds a missing leading #", () => {
    expect(normalizeHex("2C2C2C")).toBe("#2c2c2c");
  });

  it("expands 3-digit shorthand", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
  });

  it("rejects non-hex / named colors", () => {
    expect(normalizeHex("gold")).toBeUndefined();
    expect(normalizeHex("#12")).toBeUndefined();
    expect(normalizeHex(123)).toBeUndefined();
    expect(normalizeHex(null)).toBeUndefined();
  });
});
