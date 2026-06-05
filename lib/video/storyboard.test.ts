import { describe, it, expect } from "vitest";
import { parseBeat, buildStoryboard, storyboardToText } from "./storyboard";

describe("parseBeat", () => {
  it("pulls overlay text from a [bracketed] prefix", () => {
    expect(parseBeat("[Over asking again] — film the sold sign")).toEqual({
      onScreenText: "Over asking again",
      direction: "film the sold sign",
    });
  });

  it("splits on an em-dash when there's no bracket", () => {
    expect(parseBeat("Hook — we lost a house by $130k")).toEqual({
      onScreenText: "Hook",
      direction: "we lost a house by $130k",
    });
  });

  it("splits on a short leading colon label", () => {
    expect(parseBeat("Hook: we lost a house")).toEqual({
      onScreenText: "Hook",
      direction: "we lost a house",
    });
  });

  it("keeps a plain beat as overlay text", () => {
    expect(parseBeat("Walk up to the front door")).toEqual({
      onScreenText: "Walk up to the front door",
      direction: "",
    });
  });
});

describe("buildStoryboard", () => {
  it("makes one scene per non-empty beat, round-robins photos, sums duration", () => {
    const sb = buildStoryboard({
      reelScript: ["[A] — film a", "[B] — film b", "[C] — film c", "   "],
      photoUrls: ["p1", "p2"],
      headline: "Over asking",
      secondsPerScene: 3,
    });
    expect(sb.scenes).toHaveLength(3); // blank beat dropped
    expect(sb.scenes.map((s) => s.photoUrl)).toEqual(["p1", "p2", "p1"]); // round-robin
    expect(sb.scenes.every((s) => s.durationSec === 3)).toBe(true);
    expect(sb.totalSec).toBe(9);
    expect(sb.aspect).toBe("9:16");
  });

  it("works with no photos (pure shot list) and clamps duration", () => {
    const sb = buildStoryboard({ reelScript: ["A", "B"], secondsPerScene: 99 });
    expect(sb.scenes.every((s) => s.photoUrl === null)).toBe(true);
    expect(sb.scenes[0].durationSec).toBe(6); // clamped to max
  });
});

describe("storyboardToText", () => {
  it("renders a readable shot list", () => {
    const sb = buildStoryboard({ reelScript: ["[Hook] — film the door"], headline: "New listing", cta: "DM me" });
    const txt = storyboardToText(sb);
    expect(txt).toContain("REEL — New listing");
    expect(txt).toContain("Scene 1");
    expect(txt).toContain("On screen: Hook");
    expect(txt).toContain("CTA: DM me");
  });
});
