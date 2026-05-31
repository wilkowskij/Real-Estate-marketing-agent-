import { getAnthropic, FAST_MODEL, extractText } from "@/lib/anthropic/client";
import type { CampaignType } from "@/lib/supabase/types";

/**
 * Image-prompt agent. For posts WITHOUT a property photo (market stats,
 * educational, neighborhood vibes, etc.), the image generator needs a strong,
 * on-brand prompt. This asks a fast model to write one from the campaign type,
 * headline, area, and brand colors — tuned to the two winning aesthetics from
 * the market research (minimalist luxury, bold data infographic) and to avoid
 * fabricated specifics (no fake addresses, prices, or property claims).
 */
const SYSTEM = `You write prompts for an AI image generator producing real estate
SOCIAL MEDIA graphics (not photos of specific homes). Output a single vivid
prompt for one on-brand square/portrait graphic. Favor two aesthetics: (a)
minimalist luxury — ivory/beige space, elegant serif feel, soft natural light;
(b) bold data infographic — clean background, one big idea, strong accent color.
Use the provided brand colors. Never depict a real address, price, person, or
brokerage logo (those are composited later). Keep it tasteful and editorial.`;

export async function buildImagePrompt(args: {
  type: CampaignType;
  headline: string;
  area: string;
  colors: { primary: string; secondary: string; accent: string };
  instructions?: string;
}): Promise<{ prompt: string; usage: { input: number; output: number } }> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Campaign type: ${args.type}
Headline: ${args.headline}
Area: ${args.area}
Brand colors: primary ${args.colors.primary}, secondary ${args.colors.secondary}, accent ${args.colors.accent}
${args.instructions ? `Notes: ${args.instructions}` : ""}

Return ONLY the image prompt as plain text (no JSON, no preamble).`,
      },
    ],
  });

  const prompt = extractText(msg.content).trim().replace(/^["']|["']$/g, "");
  return {
    prompt: prompt || `Minimalist luxury real estate social graphic for ${args.area}, ivory and gold palette, elegant editorial style`,
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}
