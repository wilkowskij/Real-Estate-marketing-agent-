import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "crypto";
import { encryptToken, decryptToken } from "./crypto";

beforeAll(() => {
  process.env.SOCIAL_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
});

describe("social token crypto", () => {
  it("round-trips a token", () => {
    const secret = "ya29.super-secret-oauth-token";
    expect(decryptToken(encryptToken(secret))).toBe(secret);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    expect(encryptToken("x")).not.toBe(encryptToken("x"));
  });

  it("rejects a tampered ciphertext", () => {
    const enc = encryptToken("hello");
    const [iv, tag, ct] = enc.split(".");
    const flipped = ct[0] === "A" ? "B" + ct.slice(1) : "A" + ct.slice(1);
    expect(() => decryptToken([iv, tag, flipped].join("."))).toThrow();
  });
});
