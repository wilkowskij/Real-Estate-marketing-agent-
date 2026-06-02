import { describe, it, expect } from "vitest";
import {
  summarizeProduction,
  summarizeContentMix,
  summarizeEngagement,
} from "./summary";

describe("summarizeProduction", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  it("counts by state, platform, and the 30-day window", () => {
    const posts = [
      { platform: "instagram", state: "published", created_at: "2026-06-10T00:00:00Z" },
      { platform: "instagram", state: "draft", created_at: "2026-06-01T00:00:00Z" },
      { platform: "facebook", state: "scheduled", created_at: "2026-04-01T00:00:00Z" }, // outside 30d
    ];
    const s = summarizeProduction(posts, now);
    expect(s.totalPosts).toBe(3);
    expect(s.published).toBe(1);
    expect(s.drafts).toBe(1);
    expect(s.scheduled).toBe(1);
    expect(s.last30).toBe(2);
    expect(s.byPlatform.instagram).toBe(2);
    expect(s.byPlatform.facebook).toBe(1);
  });

  it("handles an empty list", () => {
    const s = summarizeProduction([], now);
    expect(s.totalPosts).toBe(0);
    expect(s.last30).toBe(0);
  });
});

describe("summarizeContentMix", () => {
  it("maps types to buckets and computes actual vs target shares", () => {
    // 2 educational-bucket, 2 listings-bucket → 50/50 actual across those buckets
    const rows = summarizeContentMix(["market_stat", "educational", "new_listing", "open_house"]);
    const edu = rows.find((r) => r.bucket === "educational")!;
    const listings = rows.find((r) => r.bucket === "listings")!;
    expect(edu.count).toBe(2);
    expect(listings.count).toBe(2);
    expect(edu.actualShare).toBeCloseTo(0.5);
    expect(listings.actualShare).toBeCloseTo(0.5);
    // target shares come from CONTENT_MIX and should be > 0
    expect(edu.targetShare).toBeGreaterThan(0);
  });

  it("returns zeroed shares when there are no campaigns", () => {
    const rows = summarizeContentMix([]);
    expect(rows.every((r) => r.count === 0 && r.actualShare === 0)).toBe(true);
  });
});

describe("summarizeEngagement", () => {
  it("flags no data on an empty set", () => {
    const s = summarizeEngagement([]);
    expect(s.hasData).toBe(false);
    expect(s.totals.engagementRate).toBe(0);
  });

  it("aggregates totals, per-platform, top posts, and engagement rate", () => {
    const s = summarizeEngagement([
      { post_id: "a", platform: "instagram", impressions: 1000, reach: 800, likes: 50, comments: 10, shares: 5, saves: 5, clicks: 20 },
      { post_id: "b", platform: "facebook", impressions: 500, reach: 400, likes: 10, comments: 2, shares: 1, saves: 0, clicks: 3 },
    ]);
    expect(s.hasData).toBe(true);
    expect(s.totals.impressions).toBe(1500);
    expect(s.totals.likes).toBe(60);
    // engagements a = 70, b = 13 → rate = 83/1500
    expect(s.totals.engagementRate).toBeCloseTo(83 / 1500);
    expect(s.topPosts[0].postId).toBe("a");
    expect(s.byPlatform.instagram.engagements).toBe(70);
  });
});
