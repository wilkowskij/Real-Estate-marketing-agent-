import { getAnthropic, MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";
import type { CampaignType, CopyPackage, Listing, MarketArea, PostFormat } from "@/lib/supabase/types";
import { DEFAULT_MARKET_AREA, areaLabel, stateName } from "@/lib/branding/marketArea";

const FORMATS: PostFormat[] = ["reel", "carousel", "infographic", "single_image"];

/**
 * Marketing Agent — a local real estate specialist for the org's chosen market.
 * Owns WHAT to say. Returns a structured copy package per campaign type.
 *
 * The local-expertise system block is built from the org's MarketArea so copy is
 * tailored to wherever they actually sell. It's still passed through cachedSystem,
 * so repeat calls for the same area reuse the prompt cache and stay cheap.
 */
export function buildLocalExpertise(area: MarketArea = DEFAULT_MARKET_AREA): string {
  const label = areaLabel(area);
  const fullState = stateName(area.state);
  const towns =
    area.towns.length > 0
      ? area.towns.join(", ")
      : `the major towns and neighborhoods of ${label}`;
  const region = area.region ? ` (the ${area.region} area)` : "";

  return `You are a senior real estate marketing copywriter who specializes in
${fullState}, and specifically ${label}${region}. You know this local market
intimately — draw on real, verifiable knowledge of it:

- Towns & character: ${towns}. Reference each town's genuine, distinctive
  character (downtown/Main Street, schools, waterfront/parks, dining, commute).
- Buyer drivers here: commute patterns to the nearest major employment hubs,
  school districts, lifestyle/amenities, property taxes, new construction vs.
  established neighborhoods. Use the drivers that are actually true for ${label}.
- Seasonality: reflect the real buying season for this region.
- NEVER invent landmarks, towns, or facts. If you are unsure a specific detail
  is true for ${label}, speak qualitatively instead of fabricating it.

WHAT PERFORMS (current real-estate social-media research — applies anywhere, use this):
- FORMAT RANKING: short video / Reels (15-60s) win by far (far more shares and
  listing inquiries than static); then carousels (6-13 slides, best for
  educational saves/shares); then single data infographics (one bold stat,
  reads in 3 seconds — the most "screenshot and send to a friend" format);
  then live/open-house streams; single static photos perform worst alone.
- VIRAL TOPIC TIERS:
  - Tier 1 (highest reach, emotional + urgent): bidding-war / over-asking
    stories; interest-rate impact explainers ("how a 0.5% move changes the
    monthly payment"); the relocation/migration story into this area (e.g. from
    the nearest big city or higher-cost market).
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
- HASHTAGS: mix broad real-estate tags with REAL local ones built from this
  market — the state, the county, and the actual town names above
  (e.g. #${area.state}RealEstate, #${area.county.replace(/\s+/g, "")}County,
  and town-specific tags). Do not reuse another region's hashtags.

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
}

/** Campaign types that are about a specific property (attribution applies). */
const LISTING_TYPES: CampaignType[] = ["just_sold", "new_listing", "open_house", "deal_of_week"];

/**
 * Build the attribution/disclaimer instruction lines for a piece of copy from
 * the agent's MLS + brokerage disclaimer. Conservative by design: it appends
 * the user-controlled disclaimer verbatim and only references the MLS as a data
 * source on listing posts — it never invents a listing brokerage or agent.
 * Returns "" when there's nothing to attribute. Exported for unit testing.
 */
export function attributionGuidance(opts: {
  mls?: string;
  disclaimer?: string | null;
  type: CampaignType;
}): string {
  const mls = opts.mls?.trim();
  const disclaimer = opts.disclaimer?.trim();
  if (!mls && !disclaimer) return "";

  const lines: string[] = ["BRAND & ATTRIBUTION:"];
  if (mls) lines.push(`- The agent is a member of ${mls}.`);
  if (disclaimer)
    lines.push(`- Brokerage disclaimer — append it VERBATIM on its own line at the very end: "${disclaimer}"`);

  if (LISTING_TYPES.includes(opts.type)) {
    lines.push(
      "- This is a listing post. Include the disclaimer above. If an MLS is named you may add a brief \"Listing information via <MLS>\" line, but NEVER fabricate a listing brokerage, co-agent, or claim a listing you were not given.",
      "- Note in compliance_notes that the disclaimer/attribution was included."
    );
  } else {
    lines.push("- Append the disclaimer above if present. Do not add MLS attribution to non-listing content.");
  }
  return lines.join("\n");
}

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
      "A MARKET STAT post (educational, Tier 1). Take ONE surprising, specific local market fact (over-asking %, price-per-sqft trend, days-on-market, rate impact, in-migration) and make it instantly legible. Slightly frustrated, real tone; end on a question that invites comments. Only use numbers actually provided — never invent stats.",
    format: "reel",
  },
  neighborhood_spotlight: {
    brief:
      "A NEIGHBORHOOD SPOTLIGHT (community). Hyperlocal beats generic: a specific town's lifestyle in this market (its downtown, waterfront/parks, the commute, real local businesses). Sell the area, not a listing.",
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
  /** The org's market — tailors the local angle, towns, and hashtags. */
  marketArea?: MarketArea;
  /** Brokerage disclaimer/license line to append verbatim (compliance). */
  disclaimer?: string | null;
  /** When true, allow the web_search tool for current market data. */
  allowWebSearch?: boolean;
}

export async function runMarketingAgent(
  input: MarketingInput
): Promise<{ copy: CopyPackage; usage: { input: number; output: number } }> {
  const client = getAnthropic();

  const guidance = CAMPAIGN_GUIDANCE[input.type];
  const area = input.marketArea ?? DEFAULT_MARKET_AREA;

  const userContent = [
    `Campaign type: ${input.type}`,
    guidance.brief,
    `Recommended format for this type: ${guidance.format} (override only if the inputs clearly call for a different format).`,
    `Market area: ${areaLabel(area)}${area.region ? ` — ${area.region}` : ""}.${
      area.towns.length ? ` Key towns: ${area.towns.join(", ")}.` : ""
    } Make every local reference, town, and hashtag specific to THIS market.`,
    input.listing ? `Listing details:\n${JSON.stringify(input.listing, null, 2)}` : "",
    input.agentName ? `Agent name: ${input.agentName}` : "",
    attributionGuidance({ mls: area.mls, disclaimer: input.disclaimer, type: input.type }),
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
    system: cachedSystem(buildLocalExpertise(area)),
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
