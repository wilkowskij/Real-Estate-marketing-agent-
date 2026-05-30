import { describe, it, expect } from "vitest";
import { estimateCostUsd } from "./client";

describe("estimateCostUsd", () => {
  it("prices Opus input+output per the rate card", () => {
    // 1M input @ $5 + 1M output @ $25 = $30
    expect(estimateCostUsd("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(30);
  });

  it("prices Haiku lower than Opus for the same usage", () => {
    const opus = estimateCostUsd("claude-opus-4-8", 500_000, 100_000);
    const haiku = estimateCostUsd("claude-haiku-4-5-20251001", 500_000, 100_000);
    expect(haiku).toBeLessThan(opus);
  });

  it("falls back to the Opus rate for an unknown model", () => {
    expect(estimateCostUsd("some-future-model", 1_000_000, 0)).toBe(
      estimateCostUsd("claude-opus-4-8", 1_000_000, 0)
    );
  });

  it("rounds to sub-cent precision", () => {
    const c = estimateCostUsd("claude-haiku-4-5-20251001", 1234, 567);
    expect(c).toBeCloseTo(0.001234 + 0.002835, 6);
  });
});
