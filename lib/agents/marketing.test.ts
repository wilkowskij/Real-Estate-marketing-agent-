import { describe, it, expect } from "vitest";
import { parseCopy } from "./marketing";

describe("parseCopy (format-aware)", () => {
  it("keeps reel_script only when format=reel", () => {
    const json = JSON.stringify({
      format: "reel",
      headline: "Over asking again",
      caption: "Here's what's happening in Monmouth County.",
      cta: "DM me",
      hashtags: ["#MonmouthCounty"],
      reel_script: ["Hook: we lost a house by $130k", "Cut to: the data"],
      carousel_slides: ["should be dropped"],
      compliance_notes: [],
    });
    const copy = parseCopy(json, "single_image");
    expect(copy.format).toBe("reel");
    expect(copy.reel_script).toHaveLength(2);
    // carousel_slides must be dropped for a reel
    expect(copy.carousel_slides).toEqual([]);
  });

  it("keeps carousel_slides only when format=carousel", () => {
    const json = JSON.stringify({
      format: "carousel",
      headline: "Red Bank 101",
      caption: "A tour of downtown.",
      cta: "Save this",
      hashtags: ["#RedBank"],
      reel_script: ["should be dropped"],
      carousel_slides: ["Slide 1", "Slide 2", "Slide 3"],
      compliance_notes: [],
    });
    const copy = parseCopy(json, "single_image");
    expect(copy.format).toBe("carousel");
    expect(copy.carousel_slides).toHaveLength(3);
    expect(copy.reel_script).toEqual([]);
  });

  it("falls back to the recommended format when the model omits/garbles it", () => {
    const json = JSON.stringify({
      format: "not_a_real_format",
      headline: "X",
      caption: "Y",
      cta: "Z",
      hashtags: [],
      compliance_notes: [],
    });
    expect(parseCopy(json, "infographic").format).toBe("infographic");
  });

  it("throws when there's no JSON object", () => {
    expect(() => parseCopy("the model said hello", "single_image")).toThrow();
  });
});
