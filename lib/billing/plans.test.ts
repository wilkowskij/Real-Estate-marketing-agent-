import { describe, it, expect } from "vitest";
import { PLANS, PLAN_ORDER, monthlyForSeats } from "./plans";

describe("plan catalog", () => {
  it("has no unlimited seats or AI allowances", () => {
    for (const id of PLAN_ORDER) {
      const p = PLANS[id];
      expect(typeof p.seats).toBe("number");
      expect(p.seats).toBeGreaterThan(0);
      expect(typeof p.aiCampaigns).toBe("number");
      expect(p.aiCampaigns).toBeGreaterThan(0);
    }
  });

  it("Team is the 10-seat anchor with a per-additional-user price", () => {
    expect(PLANS.team.seats).toBe(10);
    expect(PLANS.team.extraSeat).toBeGreaterThan(0);
    expect(PLANS.team.popular).toBe(true);
  });
});

describe("monthlyForSeats", () => {
  it("charges only the base price within the included block", () => {
    expect(monthlyForSeats("team", 1)).toBe(PLANS.team.monthly);
    expect(monthlyForSeats("team", 10)).toBe(PLANS.team.monthly);
  });

  it("adds the per-seat price for each user beyond the included block", () => {
    // 13 users on Team = base + 3 × extraSeat
    expect(monthlyForSeats("team", 13)).toBe(PLANS.team.monthly + 3 * (PLANS.team.extraSeat ?? 0));
  });

  it("solo has no overage (single seat)", () => {
    expect(monthlyForSeats("solo", 5)).toBe(PLANS.solo.monthly);
  });
});
