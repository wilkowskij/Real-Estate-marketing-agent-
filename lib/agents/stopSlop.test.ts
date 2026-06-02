import { describe, it, expect } from "vitest";
import { detectSlop, detectSlopInText } from "./stopSlop";

describe("detectSlop", () => {
  it("flags clichés and missing local specificity", () => {
    const r = detectSlop({
      headline: "Your Dream Home Awaits",
      caption: "This stunning, charming property won't last long!",
      cta: "Call today!",
    });
    expect(r.clean).toBe(false);
    expect(r.issues.some((i) => /dream home/i.test(i))).toBe(true);
    expect(r.issues.some((i) => /local specificity/i.test(i))).toBe(true);
  });

  it("passes clean, local copy", () => {
    const r = detectSlop({
      headline: "Sold in Red Bank",
      caption: "Three offers in 48 hours on this Monmouth County listing near the NJ Transit station.",
      cta: "Wondering what yours would fetch? Let's talk.",
    });
    expect(r.clean).toBe(true);
    expect(r.issues).toEqual([]);
  });
});

describe("detectSlopInText", () => {
  it("can skip the local-specificity requirement (for SMS)", () => {
    const r = detectSlopInText("Quick heads up — a place near you just listed.", {
      requireLocal: false,
    });
    expect(r.clean).toBe(true);
  });

  it("still flags clichés when local is not required", () => {
    const r = detectSlopInText("This stunning dream home is move-in ready!", {
      requireLocal: false,
    });
    expect(r.clean).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});
