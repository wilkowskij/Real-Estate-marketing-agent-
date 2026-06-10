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
 * Default local signal words (the original Monmouth County / NJ market). Callers
 * that know the org's market pass their own terms via `localTerms` so the check
 * adapts to wherever the agent actually sells.
 */
const DEFAULT_LOCAL_TERMS = [
  "red bank", "asbury park", "middletown", "freehold", "rumson", "long branch",
  "holmdel", "colts neck", "manasquan", "spring lake", "belmar", "fair haven",
  "atlantic highlands", "belford", "pier village", "monmouth", "new jersey",
  " nj ", "nj real", "jersey shore", "shore town", "coast line", "nyc commut",
  "hoboken", "north jersey",
];

export interface SlopOptions {
  /** When false, skip the local-specificity check (e.g. for short SMS). */
  requireLocal?: boolean;
  /** Local signal words for this org's market (defaults to Monmouth/NJ). */
  localTerms?: string[];
  /** Area label for the flag message, e.g. "Travis County, TX". */
  areaLabel?: string;
}

/**
 * Scan a generated copy package for slop indicators. Returns a list of
 * human-readable issues — empty list means the copy passed. No LLM call; runs
 * in microseconds inside the generate route.
 */
export function detectSlop(
  copy: Pick<CopyPackage, "headline" | "caption" | "cta">,
  opts: SlopOptions = {}
): SlopResult {
  return detectSlopInText(`${copy.headline} ${copy.caption} ${copy.cta}`, opts);
}

/**
 * Channel-agnostic slop scan over arbitrary copy text (email subject+body, an
 * SMS message, etc.). Same cliché + local-specificity checks, no LLM call.
 */
export function detectSlopInText(raw: string, opts: SlopOptions = {}): SlopResult {
  const { requireLocal = true, localTerms = DEFAULT_LOCAL_TERMS, areaLabel } = opts;
  const text = raw.toLowerCase();
  const issues: string[] = [];

  for (const { re, msg } of SLOP_PATTERNS) {
    if (re.test(text)) issues.push(msg);
  }

  const terms = localTerms.length > 0 ? localTerms : DEFAULT_LOCAL_TERMS;
  if (requireLocal && !terms.some((t) => text.includes(t.toLowerCase()))) {
    const where = areaLabel ? `${areaLabel} ` : "";
    issues.push(`No ${where}local specificity — add a town, landmark, or market angle`);
  }

  return { clean: issues.length === 0, issues };
}
