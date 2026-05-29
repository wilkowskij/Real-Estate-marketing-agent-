import { describe, it, expect } from "vitest";
import { buildSchedule, CONTENT_MIX } from "./calendar";

describe("buildSchedule", () => {
  it("produces exactly `count` slots", () => {
    expect(buildSchedule(20, new Date("2026-06-01")).length).toBe(20);
    expect(buildSchedule(8, new Date("2026-06-01")).length).toBe(8);
  });

  it("allocates buckets roughly to their target shares (largest-remainder, exact total)", () => {
    const n = 20;
    const slots = buildSchedule(n, new Date("2026-06-01"));
    const counts = new Map<string, number>();
    for (const s of slots) counts.set(s.bucket, (counts.get(s.bucket) ?? 0) + 1);

    // total is exact
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(n);

    // each bucket within 1 slot of its ideal share
    for (const b of CONTENT_MIX) {
      const ideal = b.share * n;
      const actual = counts.get(b.bucket) ?? 0;
      expect(Math.abs(actual - ideal)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps listings the smallest bucket (<= ~15%)", () => {
    const slots = buildSchedule(20, new Date("2026-06-01"));
    const listings = slots.filter((s) => s.bucket === "listings").length;
    expect(listings / 20).toBeLessThanOrEqual(0.15 + 0.001);
  });

  it("only schedules on platform best-days at the configured hour", () => {
    const slots = buildSchedule(20, new Date("2026-06-01"));
    const allowed: Record<string, { dows: number[]; hour: number }> = {
      instagram: { dows: [1, 3, 5], hour: 10 },
      facebook: { dows: [5, 6], hour: 10 },
      linkedin: { dows: [2, 4], hour: 9 },
    };
    for (const s of slots) {
      const d = new Date(s.scheduledAt);
      const rule = allowed[s.platform];
      expect(rule).toBeTruthy();
      expect(rule.dows).toContain(d.getDay());
      expect(d.getHours()).toBe(rule.hour);
    }
  });

  it("schedules in non-decreasing date order", () => {
    const slots = buildSchedule(20, new Date("2026-06-01"));
    for (let i = 1; i < slots.length; i++) {
      expect(new Date(slots[i].scheduledAt).getTime()).toBeGreaterThanOrEqual(
        new Date(slots[i - 1].scheduledAt).getTime()
      );
    }
  });
});
