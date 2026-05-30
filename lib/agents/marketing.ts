import { getAnthropic, MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";
import type { CampaignType, CopyPackage, Listing, PostFormat } from "@/lib/supabase/types";

const FORMATS: PostFormat[] = ["reel", "carousel", "infographic", "single_image"];

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

WHAT PERFORMS (from current NJ/Monmouth social-media market research — use this):
- FORMAT RANKING: short video / Reels (15-60s) win by far (far more shares and
  listing inquiries than static); then carousels (6-13 slides, best for
  educational saves/shares); then single data infographics (one bold stat,
  reads in 3 seconds — the most "screenshot and send to a friend" format);
  then live/open-house streams; single static photos perform worst alone.
- VIRAL TOPIC TIERS:
  - Tier 1 (highest reach, emotional + urgent): bidding-war / over-asking
    stories; interest-rate impact explainers ("how a 0.5% move changes the
    monthly payment"); the NYC/Hoboken -> Shore-town migration story.
  - Tier 2 (local + educational): neighborhood spotlights (hyperlocal beats
    generic); school-district breakdowns; "deal of the week"; before/after
    renovations.
  - Tier 3 (trust): video client testimonials; price drops WITH commentary on
    what it signals; luxury listing reveals.
- HOOK STYLE for video/Reels: direct, conversational, slightly frustrated/real;
  open with a surprising specific local fact; END with a question that invites
  comments (the comment section does the distribution).
- CONTENT MIX (the account-level goal the orchestrator balances; for a single
  post just match the requested type): ~25-30% educational, ~20-25% community,
  ~15-20% social proof, ~15-20% personal brand, only 10-15% actual listings.
  ~80%+ of posts give value with NO hard sell.
- AVOID (declining/■): generic blue-and-white templates, cluttered text-heavy
  designs, phone-quality snapshots as main content, hard-sell copy
  ("BUY NOW", "CALL ME").
- HASHTAGS that matter locally: #NJRealEstate #MonmouthCounty #NJHomes
  #ShoreRealEstate #AsburyPark #RedBank #HolmdelNJ #NJLuxuryHomes.

COMPLIANCE — this is mandatory, never violate it:
- Follow Fair Housing. NEVER reference or imply preferences about race, color,
  religion, national origin, sex, familial status, disability, or use coded
  "steering" language (e.g. "safe neighborhood", "great for families",
  "exclusive community", "perfect for young professionals").
- Describe the PROPERTY and the AREA's factual amenities, not the ideal buyer.
- Do not invent facts (school ratings, crime, prices, market stats). If a number
  isn't provided to you, do not fabricate it — speak qualitatively instead.
- Keep claims defensible; avoid guarantees about value/appreciation.

VOICE: warm, professional, local, concrete. Avoid cliché ("nestled",
"dream home", "must see"). Lead with what's genuinely distinctive.`;

/**
 * Per-type guidance + the research-recommended default format. The agent may
 * override the format when the inputs clearly call for something else.
 */
const CAMPAIGN_GUIDANCE: Record<CampaignType, { brief: string; format: PostFormat }> = {
  just_sold: {
    brief:
      "A JUST SOLD announcement (social proof). Celebrate the result, build the agent's credibility, invite seller leads. Do not disclose sale price unless explicitly provided. If it sold over asking / with multiple offers, lead with that.",
    format: "single_image",
  },
  new_listing: {
    brief:
      "A NEW LISTING announcement. Highlight 2-4 standout, factual features and the lifestyle the location enables. Drive to a showing / DM. A walkthrough Reel outperforms a static photo.",
    format: "reel",
  },
  open_house: {
    brief:
      "An OPEN HOUSE invite. Lead with date/time and address; make attending feel easy and worthwhile.",
    format: "single_image",
  },
  market_stat: {
    brief:
      "A MARKET STAT post (educational, Tier 1). Take ONE surprising, specific Monmouth County market fact (over-asking %, price-per-sqft trend, days-on-market, rate impact, NYC->Shore migration) and make it instantly legible. Slightly frustrated, real tone; end on a question that invites comments. Only use numbers actually provided — never invent stats.",
    format: "reel",
  },
  neighborhood_spotlight: {
    brief:
      "A NEIGHBORHOOD SPOTLIGHT (community). Hyperlocal beats generic: a specific Monmouth town's lifestyle (Asbury Park beachfront, Red Bank downtown, the commute, local businesses). Sell the area, not a listing.",
    format: "carousel",
  },
  deal_of_week: {
    brief:
      "A DEAL OF THE WEEK (educational + urgency). Curate the single best current opportunity and explain why it's notable. Creates a recurring habit. Be factual about price/terms.",
    format: "single_image",
  },
  before_after: {
    brief:
      "A BEFORE & AFTER renovation post (community/educational, ~4x listing-photo engagement). Tell the transformation story; pair the before and after clearly.",
    format: "carousel",
  },
  educational: {
    brief:
      "An EDUCATIONAL post (buyer/seller tip, rate explainer, how-the-process-works). Make the math or the step simple and shareable. No hard sell.",
    format: "carousel",
  },
  testimonial: {
    brief:
      "A CLIENT TESTIMONIAL (social proof). Center the client's words/outcome, not the agent. Video testimonials perform best; keep it authentic, not scripted.",
    format: "reel",
  },
  custom: {
    brief: "A general real-estate marketing post per the provided instructions.",
    format: "single_image",
  },
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

  const guidance = CAMPAIGN_GUIDANCE[input.type];

  const userContent = [
    `Campaign type: ${input.type}`,
    guidance.brief,
    `Recommended format for this type: ${guidance.format} (override only if the inputs clearly call for a different format).`,
    input.listing ? `Listing details:\n${JSON.stringify(input.listing, null, 2)}` : "",
    input.agentName ? `Agent name: ${input.agentName}` : "",
    input.instructions ? `Extra instructions: ${input.instructions}` : "",
    `\nReturn ONLY a JSON object matching:
{
  "format": "reel" | "carousel" | "infographic" | "single_image",
  "headline": string,        // short, punchy overlay headline (<= 6 words)
  "caption": string,         // the social caption (2-5 short paragraphs, with line breaks); for video, this is the post caption that accompanies the Reel
  "cta": string,             // one clear call to action
  "hashtags": string[],      // 6-12 relevant hashtags, mix local + topical
  "reel_script": string[],   // REQUIRED when format=reel: ordered beats, each "[on-screen text] — what to film/say"; [] otherwise
  "carousel_slides": string[], // REQUIRED when format=carousel: 6-13 slides, one line each; [] otherwise
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

  const copy = parseCopy(text, guidance.format);
  return {
    copy,
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}

/** Exported for unit testing the format-aware JSON parsing. */
export function parseCopy(text: string, fallbackFormat: PostFormat): CopyPackage {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Marketing agent returned no JSON");
  let raw: any;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    throw new Error("Marketing agent returned malformed JSON");
  }
  const format: PostFormat = FORMATS.includes(raw.format) ? raw.format : fallbackFormat;
  return {
    format,
    headline: String(raw.headline ?? ""),
    caption: String(raw.caption ?? ""),
    cta: String(raw.cta ?? ""),
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.map(String) : [],
    reel_script:
      format === "reel" && Array.isArray(raw.reel_script)
        ? raw.reel_script.map(String)
        : [],
    carousel_slides:
      format === "carousel" && Array.isArray(raw.carousel_slides)
        ? raw.carousel_slides.map(String)
        : [],
    compliance_notes: Array.isArray(raw.compliance_notes)
      ? raw.compliance_notes.map(String)
      : [],
  };
}
