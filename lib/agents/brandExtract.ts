import { getAnthropic, MODEL, extractText } from "@/lib/anthropic/client";
import type { BrandColors, BrandFonts } from "@/lib/supabase/types";

/**
 * Brand-document extractor. An org admin uploads a brand-guidelines document
 * (PDF or text/markdown); Claude reads it and returns a structured brand kit
 * the admin can review before saving. This powers company onboarding: "upload
 * your brand guide, we configure everything."
 */
export interface ExtractedBrand {
  name: string | null;
  colors: Partial<BrandColors>;
  fonts: Partial<BrandFonts>;
  disclaimer: string | null;
  /** Short voice/tone summary the marketing agent can use later. */
  voice: string | null;
  /** Any hex codes found but not mapped to primary/secondary/accent. */
  extraColors: string[];
}

const SYSTEM = `You extract a brand kit from a company's brand-guidelines document
for a real estate marketing tool. Read the document and identify:
- the brand/company name
- primary, secondary, and accent colors as #RRGGBB hex (convert named colors or
  RGB to hex; pick the most prominent as primary, a supporting tone as secondary,
  and the call-to-action / highlight color as accent)
- heading font and body font (family names only)
- any legal disclaimer / brokerage line
- a one-sentence voice & tone summary
Only use values actually present in the document. If a value is absent, return
null (or omit from the colors/fonts objects). Never invent hex codes or fonts.`;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeHex(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  let s = v.trim();
  if (!s.startsWith("#")) s = `#${s}`;
  if (HEX.test(s)) return s.toLowerCase();
  // Expand #RGB → #RRGGBB
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return ("#" + s.slice(1).split("").map((c) => c + c).join("")).toLowerCase();
  }
  return undefined;
}

/**
 * Extract a brand kit from an uploaded document.
 * @param doc Either a PDF (base64 + mediaType application/pdf) or text content.
 */
export async function extractBrandFromDocument(doc: {
  kind: "pdf" | "text";
  data: string; // base64 for pdf, raw text for text
}): Promise<{ brand: ExtractedBrand; usage: { input: number; output: number } }> {
  const client = getAnthropic();

  const userBlocks: any[] =
    doc.kind === "pdf"
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: doc.data } },
        ]
      : [{ type: "text", text: `Brand document:\n\n${doc.data.slice(0, 100_000)}` }];

  userBlocks.push({
    type: "text",
    text: `Return ONLY a JSON object:
{
  "name": string|null,
  "colors": { "primary"?: "#RRGGBB", "secondary"?: "#RRGGBB", "accent"?: "#RRGGBB" },
  "fonts": { "heading"?: string, "body"?: string },
  "disclaimer": string|null,
  "voice": string|null,
  "extraColors": ["#RRGGBB", ...]
}`,
  });

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: SYSTEM,
    messages: [{ role: "user", content: userBlocks }],
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

  const colors: Partial<BrandColors> = {};
  for (const k of ["primary", "secondary", "accent"] as const) {
    const hex = normalizeHex(raw.colors?.[k]);
    if (hex) colors[k] = hex;
  }
  const fonts: Partial<BrandFonts> = {};
  if (typeof raw.fonts?.heading === "string") fonts.heading = raw.fonts.heading;
  if (typeof raw.fonts?.body === "string") fonts.body = raw.fonts.body;

  const extraColors = Array.isArray(raw.extraColors)
    ? (raw.extraColors.map(normalizeHex).filter(Boolean) as string[])
    : [];

  return {
    brand: {
      name: typeof raw.name === "string" ? raw.name : null,
      colors,
      fonts,
      disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer : null,
      voice: typeof raw.voice === "string" ? raw.voice : null,
      extraColors,
    },
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}
