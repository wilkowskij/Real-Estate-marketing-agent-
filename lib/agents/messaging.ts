import { getAnthropic, MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";
import type { CampaignType, EmailCopy, SmsCopy, Listing, MarketArea } from "@/lib/supabase/types";
import { buildLocalExpertise, attributionGuidance } from "@/lib/agents/marketing";
import { DEFAULT_MARKET_AREA, areaLabel } from "@/lib/branding/marketArea";

/**
 * Messaging Agent — email + SMS nurture copy for the same local specialist.
 * Shares the cached local-expertise system block with the social Marketing
 * Agent (so the prompt cache is warm and calls stay cheap), but emits
 * channel-appropriate shapes instead of a social post.
 *
 * Email and SMS are direct-to-contact: they go to a database/sphere, an
 * open-house sign-in list, or a single lead. The compliance bar is the same
 * (Fair Housing, no fabricated stats), plus channel rules: SMS must be short,
 * identify the sender, and respect opt-out; email needs a real subject + an
 * inbox preview line.
 */

const CHANNEL_RULES = `CHANNEL RULES:
- EMAIL: write a specific, non-spammy subject line (no ALL CAPS, no "!!!", no
  "Open now"); a short inbox PREVIEW line (40-90 chars) that complements (does
  not repeat) the subject; a body of 2-4 short paragraphs that gives value first
  and asks once; one clear CTA. Sound like a real local agent, not a newsletter
  blast. Reference the town/area concretely.
- SMS: ONE message, under 320 characters. Conversational and human. Identify the
  agent by name if provided. No hashtags, no emoji spam (one tasteful emoji max).
  End with a soft, low-pressure ask. Never use link shorteners or fake urgency.
  Assume "Reply STOP to opt out" is appended by the sending system — do NOT add
  it yourself.`;

const EMAIL_GUIDANCE: Partial<Record<CampaignType, string>> = {
  just_sold: "A 'just sold in your neighborhood' note to the sphere — social proof that invites seller conversations. Do not state the sale price unless provided.",
  new_listing: "A new-listing announcement email to the database — lead with the lifestyle + 2-3 standout factual features; drive to a private showing.",
  open_house: "An open-house invitation email — date/time/address up top, why it's worth the stop, easy RSVP.",
  market_stat: "A market-update email — one concrete local market stat (only if provided), what it means for them, and an offer to talk through their situation.",
  neighborhood_spotlight: "A neighborhood-spotlight email — sell the town's lifestyle (real businesses, the commute, the shore), build the agent as the local expert.",
  educational: "An educational email — one genuinely useful buyer/seller tip or process explainer. Value-first, no hard sell.",
  custom: "A general nurture email per the provided instructions.",
};

const SMS_GUIDANCE: Partial<Record<CampaignType, string>> = {
  just_sold: "A quick 'just sold nearby — curious what yours is worth?' text to a past client or lead.",
  new_listing: "A short heads-up text about a new listing that fits what the contact was looking for.",
  open_house: "A brief open-house reminder text with day/time + address.",
  market_stat: "A one-line market-pulse text with a single concrete local stat (only if provided) + a soft offer to chat.",
  educational: "A short, helpful tip text that builds trust without selling.",
  custom: "A general nurture text per the provided instructions.",
};

export interface MessagingInput {
  channel: "email" | "sms";
  type: CampaignType;
  listing?: Partial<Listing>;
  instructions?: string;
  agentName?: string;
  /** Optional first name to personalize the greeting. */
  recipientName?: string;
  /** The org's market — tailors the local angle and references. */
  marketArea?: MarketArea;
  /** Brokerage disclaimer/license line — appended to email (not SMS, length). */
  disclaimer?: string | null;
}

export async function runMessagingAgent(
  input: MessagingInput
): Promise<
  | { channel: "email"; copy: EmailCopy; usage: { input: number; output: number } }
  | { channel: "sms"; copy: SmsCopy; usage: { input: number; output: number } }
> {
  const client = getAnthropic();
  const area = input.marketArea ?? DEFAULT_MARKET_AREA;
  const guidance =
    (input.channel === "email" ? EMAIL_GUIDANCE : SMS_GUIDANCE)[input.type] ??
    "A general real-estate nurture message per the provided instructions.";

  const schema =
    input.channel === "email"
      ? `{
  "subject": string,            // specific, non-spammy subject line
  "preview": string,            // inbox preview / preheader, 40-90 chars
  "body": string,               // 2-4 short paragraphs with line breaks
  "cta": string,                // one clear call to action
  "compliance_notes": string[]  // Fair-Housing notes/flags; [] if clean
}`
      : `{
  "message": string,            // one SMS under 320 chars
  "compliance_notes": string[]  // Fair-Housing notes/flags; [] if clean
}`;

  const userContent = [
    `Channel: ${input.channel.toUpperCase()}`,
    `Content type: ${input.type}`,
    guidance,
    CHANNEL_RULES,
    `Market area: ${areaLabel(area)}${area.region ? ` — ${area.region}` : ""}. Keep local references specific to THIS market.`,
    input.listing ? `Listing details:\n${JSON.stringify(input.listing, null, 2)}` : "",
    input.agentName ? `Agent name: ${input.agentName}` : "",
    input.recipientName ? `Recipient first name: ${input.recipientName}` : "",
    // Email carries the disclaimer/MLS attribution; SMS stays short (no append).
    input.channel === "email"
      ? attributionGuidance({ mls: area.mls, disclaimer: input.disclaimer, type: input.type })
      : "",
    input.instructions ? `Extra instructions: ${input.instructions}` : "",
    `\nReturn ONLY a JSON object matching:\n${schema}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: cachedSystem(buildLocalExpertise(area)),
    messages: [{ role: "user", content: userContent }],
  });

  const text = extractText(msg.content);
  const usage = { input: msg.usage.input_tokens, output: msg.usage.output_tokens };

  if (input.channel === "email") {
    return { channel: "email", copy: parseEmail(text), usage };
  }
  return { channel: "sms", copy: parseSms(text), usage };
}

/** Exported for unit testing the JSON parsing. */
export function parseEmail(text: string): EmailCopy {
  const raw = extractJson(text);
  return {
    subject: String(raw.subject ?? ""),
    preview: String(raw.preview ?? ""),
    body: String(raw.body ?? ""),
    cta: String(raw.cta ?? ""),
    compliance_notes: Array.isArray(raw.compliance_notes)
      ? raw.compliance_notes.map(String)
      : [],
  };
}

/** Exported for unit testing the JSON parsing. */
export function parseSms(text: string): SmsCopy {
  const raw = extractJson(text);
  return {
    message: String(raw.message ?? ""),
    compliance_notes: Array.isArray(raw.compliance_notes)
      ? raw.compliance_notes.map(String)
      : [],
  };
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Messaging agent returned no JSON");
  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error("Messaging agent returned malformed JSON");
  }
}
