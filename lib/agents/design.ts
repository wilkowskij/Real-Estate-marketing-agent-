import { getAnthropic, FAST_MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";

/**
 * Design Agent — owns HOW it looks.
 *
 * Two responsibilities:
 *  1. Pick the strongest "hero" photo from the agent's uploads and explain why.
 *  2. Write art-direction prompts for the AI image path (enhancement / creative).
 *
 * The deterministic template rendering itself lives in lib/design/render.ts;
 * this agent feeds it (which photo) and feeds the ImageProvider (what to make).
 */
const DESIGN_SYSTEM = `You are an art director for real estate social media.
You judge listing photos for marketing impact: strong natural light, clean
composition, curb appeal or a standout interior, no clutter, no people, no
visible reflections of the photographer. You write concise, concrete
art-direction prompts. You NEVER suggest edits that misrepresent the property
(no removing/adding permanent features, no fake views) — only sky cleanup,
exposure/white-balance, lawn greening, and clearly-labeled virtual staging of
empty rooms.`;

export interface PhotoRef {
  assetId: string;
  /** Publicly fetchable (signed) URL for vision analysis. */
  url: string;
}

export interface DesignDecision {
  heroAssetId: string;
  reason: string;
  /** Prompt for the AI image path; null if no enhancement is warranted. */
  enhancementPrompt: string | null;
}

export async function runDesignAgent(args: {
  photos: PhotoRef[];
  campaignType: string;
}): Promise<DesignDecision> {
  if (args.photos.length === 0) {
    throw new Error("Design agent needs at least one photo");
  }
  // Single photo: no need to spend a vision call choosing.
  if (args.photos.length === 1) {
    return {
      heroAssetId: args.photos[0].assetId,
      reason: "Only one photo supplied.",
      enhancementPrompt: null,
    };
  }

  const client = getAnthropic();
  const content: any[] = [
    {
      type: "text",
      text: `Campaign: ${args.campaignType}. Choose the single best hero photo for the
graphic and, if helpful, give ONE compliant enhancement prompt. Photos are listed
in order; refer to them by their 0-based index.

Return ONLY JSON: {"heroIndex": number, "reason": string, "enhancementPrompt": string|null}`,
    },
  ];
  for (const p of args.photos) {
    content.push({ type: "image", source: { type: "url", url: p.url } });
  }

  const msg = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 500,
    system: cachedSystem(DESIGN_SYSTEM),
    messages: [{ role: "user", content }],
  });

  const text = extractText(msg.content);
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? JSON.parse(match[0]) : { heroIndex: 0 };
  const idx = Math.min(Math.max(0, Number(raw.heroIndex) || 0), args.photos.length - 1);

  return {
    heroAssetId: args.photos[idx].assetId,
    reason: String(raw.reason ?? ""),
    enhancementPrompt: raw.enhancementPrompt ? String(raw.enhancementPrompt) : null,
  };
}
