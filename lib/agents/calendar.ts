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
];

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
export function buildSchedule(count: number, start: Date): Omit<PlannedPost, "angle">[] {
  // 1) Largest-remainder allocation of slot counts per bucket.
  const raw = CONTENT_MIX.map((b) => ({ b, exact: b.share * count }));
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
    const match = PLATFORM_SLOTS.find((p) => p.dows.includes(dow));
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

const PLANNER_SYSTEM = `You are a real estate content strategist for New Jersey /
Monmouth County. Given a pre-built posting SCHEDULE (each slot already has a
content type, format, platform, and date), assign each slot a specific, local,
non-repeating ANGLE/HOOK suited to that type. Use the proven viral angles:
bidding-war/over-asking, rate-impact explainers, NYC->Shore migration,
hyperlocal neighborhood spotlights (name real Monmouth towns), school/commute,
deal-of-week, before/after, testimonials. Keep hooks concrete and conversational;
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
}): Promise<{ posts: PlannedPost[]; usage: { input: number; output: number } }> {
  const schedule = buildSchedule(args.count, args.start ?? new Date());
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
