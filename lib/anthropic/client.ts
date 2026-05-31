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

/**
 * Per-model token pricing in USD per 1M tokens (input, output). Used to estimate
 * the cost of an agent run for the agent_runs audit log. Update when Anthropic
 * pricing changes; unknown models fall back to the Opus rate (conservative).
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

/** Estimate the USD cost of a call from its model + token usage. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING["claude-opus-4-8"];
  const cost = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  // Round to 6 decimals — sub-cent precision without float noise.
  return Math.round(cost * 1e6) / 1e6;
}
