import { describe, it, expect } from "vitest";
import { parseEmail, parseSms } from "./messaging";

describe("parseEmail", () => {
  it("extracts the email fields from a fenced JSON blob", () => {
    const text = `Here you go:
\`\`\`json
{
  "subject": "What homes near the Red Bank train really sold for",
  "preview": "A quick read on the spring market",
  "body": "Hi Sarah,\\n\\nThree homes near the station closed this month...",
  "cta": "Reply and I'll send the full breakdown.",
  "compliance_notes": []
}
\`\`\``;
    const copy = parseEmail(text);
    expect(copy.subject).toContain("Red Bank");
    expect(copy.preview).toBeTruthy();
    expect(copy.body).toContain("Sarah");
    expect(copy.cta).toBeTruthy();
    expect(copy.compliance_notes).toEqual([]);
  });

  it("coerces missing fields to safe defaults", () => {
    const copy = parseEmail(`{"subject": "Hi"}`);
    expect(copy.subject).toBe("Hi");
    expect(copy.body).toBe("");
    expect(copy.compliance_notes).toEqual([]);
  });

  it("throws when there is no JSON", () => {
    expect(() => parseEmail("no json here")).toThrow();
  });
});

describe("parseSms", () => {
  it("extracts the message", () => {
    const copy = parseSms(`{"message": "Hi Sarah — a home near you in Holmdel just sold. Curious what yours is worth?", "compliance_notes": []}`);
    expect(copy.message).toContain("Holmdel");
    expect(copy.compliance_notes).toEqual([]);
  });

  it("coerces a missing message to empty string", () => {
    const copy = parseSms(`{"compliance_notes": ["check opt-out"]}`);
    expect(copy.message).toBe("");
    expect(copy.compliance_notes).toEqual(["check opt-out"]);
  });
});
