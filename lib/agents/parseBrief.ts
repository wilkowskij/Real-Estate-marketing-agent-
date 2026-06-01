import { getAnthropic, FAST_MODEL, extractText } from "@/lib/anthropic/client";
import type { CampaignType } from "@/lib/supabase/types";

/**
 * Natural-language intake. Turns a single free-text prompt ("Just sold 14
 * Riverside Ave in Red Bank for $1.25M, 4 bed 3 bath, walk to the train") into
 * the structured fields the generator already understands, so the agent can
 * skip the long form. The agent still reviews/edits before generating.
 */
export interface ParsedBrief {
  type: CampaignType | null;
  listing: {
    address?: string;
    town?: string;
    price?: number | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
  };
  instructions: string | null;
}

const TYPES: CampaignType[] = [
  "just_sold", "new_listing", "open_house", "market_stat",
  "neighborhood_spotlight", "deal_of_week", "before_after",
  "educational", "testimonial", "custom",
];

const SYSTEM = `You convert a real estate agent's one-line request into structured
campaign fields. Pick the best campaign "type" from this exact list:
just_sold, new_listing, open_house, market_stat, neighborhood_spotlight,
deal_of_week, before_after, educational, testimonial, custom.
Extract any listing details mentioned (address, town, price as a number,
beds, baths, sqft). Put anything else worth emphasizing (features, tone, angle)
into "instructions". Never invent details that weren't stated.`;

export async function parseBrief(
  prompt: string
): Promise<{ brief: ParsedBrief; usage: { input: number; output: number } }> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 500,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Request: ${prompt}

Return ONLY JSON:
{
  "type": one of the listed types or null,
  "listing": { "address"?: string, "town"?: string, "price"?: number, "beds"?: number, "baths"?: number, "sqft"?: number },
  "instructions": string|null
}`,
      },
    ],
  });

  const text = extractText(msg.content);
  const match = text.match(/\{[\s\S]*\}/);
  let raw: any = {};
  if (match) {
    try {
      raw = JSON.parse(match[0]);
    } catch {
      raw = {};
    }
  }

  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const type: CampaignType | null = TYPES.includes(raw.type) ? raw.type : null;

  return {
    brief: {
      type,
      listing: {
        address: str(raw.listing?.address),
        town: str(raw.listing?.town),
        price: num(raw.listing?.price),
        beds: num(raw.listing?.beds),
        baths: num(raw.listing?.baths),
        sqft: num(raw.listing?.sqft),
      },
      instructions: str(raw.instructions) ?? null,
    },
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}
