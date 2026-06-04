import { getAnthropic, MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";
import type { CampaignType, PostFormat } from "@/lib/supabase/types";

/**
 * Calendar planner — the orchestrator's "plan a month" capability.
 *
 * The content-mix RATIOS are enforced deterministically in code (reliable,
 * testable) so the balance never drifts on an LLM whim. A single Claude call
 * then fills each pre-allocated slot with a concrete Monmouth County angle +
 * hook. That keeps cost flat (one call for the whole month) while staying local
 * and on-brand. Full copy/graphics are generated later, per post, on demand.
 */

/** The five content buckets and their target share (from the market research). */
export interface MixBucket {
  bucket: string;
  /** Target fraction of the calendar. */
  share: number;
  /** Campaign types that satisfy this bucket. */
  types: CampaignType[];
}

export const CONTENT_MIX: MixBucket[] = [
  { bucket: "educational", share: 0.275, types: ["market_stat", "educational"] },
  { bucket: "community", share: 0.225, types: ["neighborhood_spotlight", "before_after"] },
  { bucket: "social_proof", share: 0.175, types: ["just_sold", "testimonial"] },
  { bucket: "personal_brand", share: 0.175, types: ["custom"] },
  { bucket: "listings", share: 0.125, types: ["new_listing", "open_house", "deal_of_week"] },
];

/** Human-friendly labels + descriptions for the mix settings UI. */
export const MIX_LABELS: Record<string, { label: string; hint: string }> = {
  educational: { label: "Educational", hint: "Market stats, how-to, rate explainers" },
  community: { label: "About the community", hint: "Neighborhood spotlights, before/after" },
  social_proof: { label: "Social proof", hint: "Just sold, testimonials, reviews" },
  personal_brand: { label: "Personal brand", hint: "Your story, behind the scenes" },
  listings: { label: "The house (listings)", hint: "New listings, open houses, deals" },
};

/**
 * Resolve the content mix from optional caller-supplied weights. Each weight is
 * a relative number (e.g. a slider 0–100); they're normalized to shares that sum
 * to 1, so the caller never has to make them add up. Buckets omitted from
 * `weights` fall back to their research default. Buckets explicitly set to 0 are
 * dropped from the calendar entirely. Returns the canonical CONTENT_MIX when no
 * weights are given.
 */
export function resolveMix(weights?: Record<string, number>): MixBucket[] {
  if (!weights || Object.keys(weights).length === 0) return CONTENT_MIX;
  const raw = CONTENT_MIX.map((b) => ({
    ...b,
    weight: weights[b.bucket] ?? b.share,
  }));
  const total = raw.reduce((s, b) => s + (b.weight > 0 ? b.weight : 0), 0);
  // Guard against an all-zero mix → fall back to defaults rather than produce nothing.
  if (total <= 0) return CONTENT_MIX;
  return raw
    .filter((b) => b.weight > 0)
    .map(({ weight, ...b }) => ({ ...b, share: weight / total }));
}

/** Research-recommended default format per type (mirrors the marketing agent). */
const TYPE_FORMAT: Record<CampaignType, PostFormat> = {
  just_sold: "single_image",
  new_listing: "reel",
  open_house: "single_image",
  market_stat: "reel",
  neighborhood_spotlight: "carousel",
  deal_of_week: "single_image",
  before_after: "carousel",
  educational: "carousel",
  testimonial: "reel",
  custom: "single_image",
};

/** Per-platform best posting day/time (research table), as a weekly rotation. */
const PLATFORM_SLOTS: { platform: string; dows: number[]; hour: number }[] = [
  { platform: "instagram", dows: [1, 3, 5], hour: 10 }, // Mon/Wed/Fri 10am
  { platform: "facebook", dows: [5, 6], hour: 10 }, // Fri/Sat
  { platform: "linkedin", dows: [2, 4], hour: 9 }, // Tue/Thu 9am
  { platform: "twitter", dows: [1, 2, 3, 4, 5], hour: 12 }, // Weekdays noon
];

/** Platforms the planner can schedule for (used by the UI selector). */
export const PLANNABLE_PLATFORMS = ["instagram", "facebook", "linkedin", "twitter"] as const;

export interface PlannedPost {
  /** ISO date-time the post is scheduled for. */
  scheduledAt: string;
  type: CampaignType;
  format: PostFormat;
  bucket: string;
  platform: string;
  /** Concrete local angle / hook the agent assigned to this slot. */
  angle: string;
}

/**
 * Allocate `count` slots across the buckets per their target shares (largest-
 * remainder rounding so the totals are exact), pick a concrete type per slot
 * (round-robin within the bucket), assign a platform + best-time date starting
 * from `start`, spreading evenly. Pure + deterministic → unit-testable.
 */
export function buildSchedule(
  count: number,
  start: Date,
  mix: MixBucket[] = CONTENT_MIX,
  platforms?: string[]
): Omit<PlannedPost, "angle">[] {
  // Restrict to the chosen platforms (fall back to all if none/invalid given).
  const picked = platforms?.length
    ? PLATFORM_SLOTS.filter((p) => platforms.includes(p.platform))
    : PLATFORM_SLOTS;
  const activeSlots = picked.length ? picked : PLATFORM_SLOTS;
  // 1) Largest-remainder allocation of slot counts per bucket.
  const raw = mix.map((b) => ({ b, exact: b.share * count }));
  const alloc = raw.map((r) => ({ b: r.b, n: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let assigned = alloc.reduce((s, a) => s + a.n, 0);
  alloc
    .slice()
    .sort((x, y) => y.rem - x.rem)
    .forEach((a) => {
      if (assigned < count) {
        a.n += 1;
        assigned += 1;
      }
    });

  // 2) Expand to a flat list of (type, bucket, format), round-robin within bucket.
  const slots: { type: CampaignType; bucket: string; format: PostFormat }[] = [];
  for (const a of alloc) {
    for (let i = 0; i < a.n; i++) {
      const type = a.b.types[i % a.b.types.length];
      slots.push({ type, bucket: a.b.bucket, format: TYPE_FORMAT[type] });
    }
  }

  // 3) Interleave buckets so the feed feels varied (not 8 educational in a row).
  slots.sort((x, y) => x.bucket.localeCompare(y.bucket));
  const interleaved: typeof slots = [];
  let idx = 0;
  const byBucket = new Map<string, typeof slots>();
  for (const s of slots) {
    if (!byBucket.has(s.bucket)) byBucket.set(s.bucket, []);
    byBucket.get(s.bucket)!.push(s);
  }
  const queues = [...byBucket.values()];
  while (interleaved.length < slots.length) {
    const q = queues[idx % queues.length];
    if (q.length) interleaved.push(q.shift()!);
    idx++;
  }

  // 4) Assign each slot a date+time using the platform rotation and best-times,
  //    spreading the slots across the days following `start`.
  const out: Omit<PlannedPost, "angle">[] = [];
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  let slotIdx = 0;
  // Walk forward day by day; on a day that matches a platform's best DOW, place
  // the next slot there. The cap scales with the slot count (≥1 posting day per
  // 7-day window) plus a margin, so we always place every slot yet still
  // terminate even if the platform DOWs were ever narrowed.
  const maxDays = interleaved.length * 7 + 14;
  for (let day = 0; day < maxDays && slotIdx < interleaved.length; day++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + day);
    const dow = d.getDay();
    const match = activeSlots.find((p) => p.dows.includes(dow));
    if (!match) continue;
    const slot = interleaved[slotIdx++];
    const when = new Date(d);
    when.setHours(match.hour, 0, 0, 0);
    out.push({
      scheduledAt: when.toISOString(),
      type: slot.type,
      format: slot.format,
      bucket: slot.bucket,
      platform: match.platform,
    });
  }
  return out;
}

const PLANNER_SYSTEM = `You are a real estate content strategist for the agent's
local market (given as "Area" in the prompt). Given a pre-built posting SCHEDULE
(each slot already has a content type, format, platform, and date), assign each
slot a specific, local, non-repeating ANGLE/HOOK suited to that type. Use the
proven viral angles: bidding-war/over-asking, rate-impact explainers, relocation/
in-migration into the area, hyperlocal neighborhood spotlights (name real towns in
the target area), school/commute, deal-of-week, before/after, testimonials. Only
reference towns and facts that are genuinely true for the named Area. Keep hooks
concrete and conversational;
for Reels make the hook a scroll-stopper that ends implying a question. Never
invent specific statistics — keep angles qualitative unless a number is given.
Respect Fair Housing (no steering language).`;

/**
 * Fill a schedule with concrete angles via ONE Claude call. Falls back to the
 * type's generic brief if the model output can't be parsed, so a calendar is
 * always produced.
 */
export async function planContentCalendar(args: {
  count: number;
  start?: Date;
  area?: string;
  /** Relative per-bucket weights (e.g. from the mix-settings sliders). */
  mix?: Record<string, number>;
  /** Platforms to schedule across (default: all). */
  platforms?: string[];
}): Promise<{ posts: PlannedPost[]; usage: { input: number; output: number } }> {
  const schedule = buildSchedule(args.count, args.start ?? new Date(), resolveMix(args.mix), args.platforms);
  const area = args.area ?? "Monmouth County, NJ";
  const client = getAnthropic();

  const slotList = schedule
    .map((s, i) => `${i}: type=${s.type} format=${s.format} platform=${s.platform} date=${s.scheduledAt.slice(0, 10)}`)
    .join("\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: cachedSystem(PLANNER_SYSTEM),
    messages: [
      {
        role: "user",
        content: `Area: ${area}\nAssign a one-line angle/hook to each slot. Return ONLY a JSON array of objects {"i": number, "angle": string} for every slot index below:\n\n${slotList}`,
      },
    ],
  });

  const text = extractText(msg.content);
  const angles = new Map<number, string>();
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      for (const row of JSON.parse(match[0]) as { i: number; angle: string }[]) {
        if (typeof row.i === "number" && row.angle) angles.set(row.i, String(row.angle));
      }
    } catch {
      /* fall through to defaults */
    }
  }

  const posts: PlannedPost[] = schedule.map((s, i) => ({
    ...s,
    angle: angles.get(i) ?? `${s.bucket} post for ${area}`,
  }));

  return {
    posts,
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}

/**
 * Generate ONE fresh angle/hook for a single planned slot — backs the queue's
 * "recreate" action. One cheap Claude call; falls back to a generic line.
 */
export async function generateAngle(args: {
  type: CampaignType;
  format: PostFormat;
  area?: string;
}): Promise<{ angle: string; usage: { input: number; output: number } }> {
  const area = args.area ?? "Monmouth County, NJ";
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: cachedSystem(PLANNER_SYSTEM),
    messages: [
      {
        role: "user",
        content: `Area: ${area}\nWrite ONE fresh, specific, local angle/hook for a ${args.type} ${args.format} post. Different from anything generic. Return ONLY the single line of text, no quotes or JSON.`,
      },
    ],
  });
  const angle = extractText(msg.content).trim().replace(/^["']|["']$/g, "") || `${args.type} post for ${area}`;
  return { angle, usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens } };
}
