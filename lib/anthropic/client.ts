import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
export const FAST_MODEL =
  process.env.ANTHROPIC_FAST_MODEL ?? "claude-haiku-4-5-20251001";

/**
 * Mark a large, stable system prompt for caching. We keep big knowledge blocks
 * (local-market expertise, brand context) in a cached system block so repeated
 * generations only pay to read the cache, not re-send the tokens.
 */
export function cachedSystem(text: string): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    },
  ];
}

/** Concatenate all text blocks from a message response. */
export function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}
