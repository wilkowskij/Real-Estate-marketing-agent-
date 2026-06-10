import type { CopyPackage } from "@/lib/supabase/types";

export interface SlopResult {
  clean: boolean;
  issues: string[];
}

/**
 * Patterns that indicate generic, low-engagement "slop" — content that could
 * have been written for any market with no local angle, or that uses tired
 * real-estate clichés that underperform on social.
 */
const SLOP_PATTERNS: { re: RegExp; msg: string }[] = [
  { re: /\bdream home\b/i,                   msg: 'Cliché: "dream home"' },
  { re: /\bstunning\b/i,                     msg: 'Overused: "stunning"' },
  { re: /\bamazing (home|property|space)\b/i, msg: 'Vague: "amazing home/property"' },
  { re: /\bbeautiful home\b/i,               msg: 'Generic: "beautiful home"' },
  { re: /\bdon'?t miss (out|this)\b/i,       msg: 'Hard-sell: "don\'t miss out"' },
  { re: /\bcall (me )?today\b/i,             msg: 'Cliché CTA: "call today"' },
  { re: /\bdm me\b/i,                        msg: 'Weak CTA: "DM me"' },
  { re: /\bnestled?\b/i,                     msg: 'Real-estate cliché: "nestled"' },
  { re: /\bboasts?\b/i,                      msg: 'Real-estate cliché: "boasts"' },
  { re: /\bpristine\b/i,                     msg: 'Overused: "pristine"' },
  { re: /\bcharming\b/i,                     msg: 'Overused: "charming"' },
  { re: /\bluxury living\b/i,                msg: 'Generic: "luxury living"' },
  { re: /\bopportunity knock/i,              msg: 'Cliché: "opportunity knocks"' },
  { re: /\byour perfect home\b/i,            msg: 'Generic: "your perfect home"' },
  { re: /\bperfect for (any|every|all)\b/i,  msg: 'Vague: "perfect for any…"' },
  { re: /\bmove[-\s]?in ready\b/i,           msg: 'Overused: "move-in ready"' },
  { re: /\bwon'?t last( long)?\b/i,          msg: 'Pressure tactic: "won\'t last"' },
  { re: /\bschedule (a |your )?(showing|tour|visit)\b/i, msg: 'Cliché CTA: "schedule a showing"' },
];

/**
 * Generic local-specificity signals. Any two-letter US state abbreviation or
 * a US zip-code pattern counts; so does a comma followed by a capitalized word
 * (city, state pattern). These are broad — the org area words are also checked
 * when provided via detectSlopInText's `area` option.
 */
const LOCAL_SIGNAL_PATTERNS = [
  /\b[A-Z]{2}\b/, // state abbreviation (TX, FL, CA, NJ …)
  /\b\d{5}\b/, // zip code
  /,\s+[A-Z]/, // "City, S" pattern
];

/**
 * Scan a generated copy package for slop indicators. Returns a list of
 * human-readable issues — empty list means the copy passed. No LLM call; runs
 * in microseconds inside the generate route.
 */
export function detectSlop(
  copy: Pick<CopyPackage, "headline" | "caption" | "cta">,
  area?: string
): SlopResult {
  return detectSlopInText(`${copy.headline} ${copy.caption} ${copy.cta}`, { area });
}

/**
 * Channel-agnostic slop scan over arbitrary copy text (email subject+body, an
 * SMS message, etc.). Same cliché + local-specificity checks, no LLM call.
 *
 * @param opts.requireLocal - whether to enforce local specificity (default true)
 * @param opts.area - org's configured market area; words from it are added to
 *   the local-signal check so area-specific terms count (e.g. "Austin", "TX")
 */
export function detectSlopInText(
  raw: string,
  opts: { requireLocal?: boolean; area?: string } = {}
): SlopResult {
  const { requireLocal = true, area } = opts;
  const text = raw.toLowerCase();
  const issues: string[] = [];

  for (const { re, msg } of SLOP_PATTERNS) {
    if (re.test(text)) issues.push(msg);
  }

  if (requireLocal) {
    // Check generic location signals (state abbreviation, zip, "City, S" pattern).
    const hasGenericSignal = LOCAL_SIGNAL_PATTERNS.some((re) => re.test(raw));
    // Also check for any word from the org's configured area (case-insensitive).
    const areaWords = area
      ? area.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2)
      : [];
    const hasAreaWord = areaWords.length > 0 && areaWords.some((w) => text.includes(w));

    if (!hasGenericSignal && !hasAreaWord) {
      issues.push("No local specificity detected — add a town, neighborhood, or market area name");
    }
  }

  return { clean: issues.length === 0, issues };
}
