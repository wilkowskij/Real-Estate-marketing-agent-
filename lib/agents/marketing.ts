import { getAnthropic, MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";
import type { CampaignType, CopyPackage, Listing } from "@/lib/supabase/types";

/**
 * Marketing Agent — the NJ / Monmouth County specialist.
 * Owns WHAT to say. Returns a structured copy package per campaign type.
 *
 * Local expertise lives in a cached system block so repeat calls are cheap.
 */
const LOCAL_EXPERTISE = `You are a senior real estate marketing copywriter who specializes in
New Jersey, and specifically Monmouth County. You know the local market intimately:

- Towns & character: Red Bank (walkable downtown, dining, arts), Asbury Park
  (beach, music, nightlife), Middletown (top schools, commuter-friendly to NYC),
  Freehold (historic + retail), Rumson & Fair Haven (affluent, riverfront),
  Long Branch & Pier Village (oceanfront condos), Holmdel, Colts Neck (horse
  country, large lots), Manasquan/Spring Lake/Belmar (shore towns).
- Buyer drivers here: NYC commute (NJ Transit North Jersey Coast Line, ferry from
  Belford/Atlantic Highlands), school districts, shore/beach access, taxes,
  new construction vs. historic charm.
- Seasonality: spring market surge, summer shore demand, fall NYC-relocation buyers.

COMPLIANCE — this is mandatory, never violate it:
- Follow Fair Housing. NEVER reference or imply preferences about race, color,
  religion, national origin, sex, familial status, disability, or use coded
  "steering" language (e.g. "safe neighborhood", "great for families",
  "exclusive community", "perfect for young professionals").
- Describe the PROPERTY and the AREA's factual amenities, not the ideal buyer.
- Do not invent facts (school ratings, crime, prices). If unknown, omit.
- Keep claims defensible; avoid guarantees about value/appreciation.

VOICE: warm, professional, local, concrete. Avoid cliché ("nestled",
"dream home", "must see"). Lead with what's genuinely distinctive.`;

const CAMPAIGN_GUIDANCE: Record<CampaignType, string> = {
  just_sold:
    "A JUST SOLD announcement. Celebrate the result, build the agent's credibility, invite seller leads. Do not disclose sale price unless explicitly provided.",
  new_listing:
    "A NEW LISTING announcement. Highlight 2-4 standout, factual features and the lifestyle the location enables. Drive to a showing / DM.",
  open_house:
    "An OPEN HOUSE invite. Lead with date/time and address; make attending feel easy and worthwhile.",
  custom:
    "A general real-estate marketing post per the provided instructions.",
};

export interface MarketingInput {
  type: CampaignType;
  listing?: Partial<Listing>;
  instructions?: string;
  agentName?: string;
  /** When true, allow the web_search tool for current market data. */
  allowWebSearch?: boolean;
}

export async function runMarketingAgent(
  input: MarketingInput
): Promise<{ copy: CopyPackage; usage: { input: number; output: number } }> {
  const client = getAnthropic();

  const userContent = [
    `Campaign type: ${input.type}`,
    CAMPAIGN_GUIDANCE[input.type],
    input.listing ? `Listing details:\n${JSON.stringify(input.listing, null, 2)}` : "",
    input.agentName ? `Agent name: ${input.agentName}` : "",
    input.instructions ? `Extra instructions: ${input.instructions}` : "",
    `\nReturn ONLY a JSON object matching:
{
  "headline": string,        // short, punchy overlay headline (<= 6 words)
  "caption": string,         // the social caption (2-5 short paragraphs, with line breaks)
  "cta": string,             // one clear call to action
  "hashtags": string[],      // 6-12 relevant hashtags, mix local + topical
  "compliance_notes": string[] // any Fair-Housing notes or flags; [] if clean
}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: cachedSystem(LOCAL_EXPERTISE),
    // web_search wiring is left as a tool the orchestrator can enable; the core
    // generator runs without it for determinism and speed.
    messages: [{ role: "user", content: userContent }],
  });

  const text = extractText(msg.content);

  const copy = parseCopy(text);
  return {
    copy,
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}

function parseCopy(text: string): CopyPackage {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Marketing agent returned no JSON");
  const raw = JSON.parse(match[0]);
  return {
    headline: String(raw.headline ?? ""),
    caption: String(raw.caption ?? ""),
    cta: String(raw.cta ?? ""),
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.map(String) : [],
    compliance_notes: Array.isArray(raw.compliance_notes)
      ? raw.compliance_notes.map(String)
      : [],
  };
}
