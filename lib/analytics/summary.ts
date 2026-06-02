import { CONTENT_MIX, type MixBucket } from "@/lib/agents/calendar";
import type { CampaignType } from "@/lib/supabase/types";

/**
 * Analytics summarizers. Pure + deterministic so they're unit-testable and can
 * run on the server without extra round-trips. Two families:
 *  - PRODUCTION: what the agent has made (works today from posts/campaigns).
 *  - ENGAGEMENT: how it performed (populates as social_metrics fills in).
 */

export interface PostRow {
  platform: string;
  state: string;
  created_at: string;
}

export interface ProductionSummary {
  totalPosts: number;
  published: number;
  scheduled: number;
  drafts: number;
  last30: number;
  byPlatform: Record<string, number>;
  byState: Record<string, number>;
}

export function summarizeProduction(posts: PostRow[], now = new Date()): ProductionSummary {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const byPlatform: Record<string, number> = {};
  const byState: Record<string, number> = {};
  let last30 = 0;
  for (const p of posts) {
    byPlatform[p.platform] = (byPlatform[p.platform] ?? 0) + 1;
    byState[p.state] = (byState[p.state] ?? 0) + 1;
    if (new Date(p.created_at) >= cutoff) last30 += 1;
  }
  return {
    totalPosts: posts.length,
    published: byState["published"] ?? 0,
    scheduled: byState["scheduled"] ?? 0,
    drafts: byState["draft"] ?? 0,
    last30,
    byPlatform,
    byState,
  };
}

export interface MixRow {
  bucket: string;
  label: string;
  count: number;
  actualShare: number;
  targetShare: number;
}

/** Map each campaign's type into its content-mix bucket and compare to target. */
const TYPE_TO_BUCKET: Record<CampaignType, string> = (() => {
  const m = {} as Record<CampaignType, string>;
  for (const b of CONTENT_MIX) for (const t of b.types) m[t] = b.bucket;
  return m;
})();

const BUCKET_LABEL: Record<string, string> = {
  educational: "Educational",
  community: "Community",
  social_proof: "Social proof",
  personal_brand: "Personal brand",
  listings: "Listings",
};

export function summarizeContentMix(types: CampaignType[]): MixRow[] {
  const counts: Record<string, number> = {};
  for (const t of types) {
    const bucket = TYPE_TO_BUCKET[t];
    if (bucket) counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return CONTENT_MIX.map((b: MixBucket) => ({
    bucket: b.bucket,
    label: BUCKET_LABEL[b.bucket] ?? b.bucket,
    count: counts[b.bucket] ?? 0,
    actualShare: total > 0 ? (counts[b.bucket] ?? 0) / total : 0,
    targetShare: b.share,
  }));
}

export interface MetricRow {
  post_id: string;
  platform: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
}

export interface EngagementSummary {
  hasData: boolean;
  totals: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    engagementRate: number; // (likes+comments+shares+saves) / impressions
  };
  byPlatform: Record<string, { impressions: number; engagements: number }>;
  topPosts: { postId: string; platform: string; engagements: number }[];
}

const num = (v: number | null | undefined) => (typeof v === "number" ? v : 0);

/**
 * Aggregate engagement from per-post metric snapshots. The caller should pass
 * one row per post (the latest snapshot). Returns hasData=false when empty so
 * the dashboard can show an explanatory state instead of a wall of zeros.
 */
export function summarizeEngagement(metrics: MetricRow[]): EngagementSummary {
  const totals = {
    impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, engagementRate: 0,
  };
  const byPlatform: Record<string, { impressions: number; engagements: number }> = {};
  const perPost: { postId: string; platform: string; engagements: number }[] = [];

  for (const m of metrics) {
    const eng = num(m.likes) + num(m.comments) + num(m.shares) + num(m.saves);
    totals.impressions += num(m.impressions);
    totals.reach += num(m.reach);
    totals.likes += num(m.likes);
    totals.comments += num(m.comments);
    totals.shares += num(m.shares);
    totals.saves += num(m.saves);
    totals.clicks += num(m.clicks);
    if (!byPlatform[m.platform]) byPlatform[m.platform] = { impressions: 0, engagements: 0 };
    byPlatform[m.platform].impressions += num(m.impressions);
    byPlatform[m.platform].engagements += eng;
    perPost.push({ postId: m.post_id, platform: m.platform, engagements: eng });
  }

  totals.engagementRate =
    totals.impressions > 0
      ? (totals.likes + totals.comments + totals.shares + totals.saves) / totals.impressions
      : 0;

  const topPosts = perPost.sort((a, b) => b.engagements - a.engagements).slice(0, 5);

  return { hasData: metrics.length > 0, totals, byPlatform, topPosts };
}

// ---------------------------------------------------------------------------
// Revenue attribution: post → click → lead → deal.
// ---------------------------------------------------------------------------

export interface DealRow {
  stage: string;
  value: number | null;
  source: string | null;
}

export interface RevenueSummary {
  hasData: boolean;
  wonValue: number;
  wonCount: number;
  pipelineValue: number; // value of open (non-closed) deals
  openCount: number;
  lostCount: number;
  /** Won revenue + deal count grouped by attribution source. */
  bySource: { source: string; deals: number; wonValue: number }[];
}

const SOURCE_LABEL: Record<string, string> = {
  landing: "Landing page",
  open_house: "Open house",
  qr: "QR code",
  manual: "Manual",
};

export function summarizeRevenue(deals: DealRow[]): RevenueSummary {
  let wonValue = 0, wonCount = 0, pipelineValue = 0, openCount = 0, lostCount = 0;
  const bySrc = new Map<string, { deals: number; wonValue: number }>();

  for (const d of deals) {
    const v = num(d.value);
    const src = d.source ? SOURCE_LABEL[d.source] ?? d.source : "Unattributed";
    if (!bySrc.has(src)) bySrc.set(src, { deals: 0, wonValue: 0 });
    const row = bySrc.get(src)!;
    row.deals += 1;

    if (d.stage === "closed_won") {
      wonValue += v; wonCount += 1; row.wonValue += v;
    } else if (d.stage === "closed_lost") {
      lostCount += 1;
    } else {
      pipelineValue += v; openCount += 1;
    }
  }

  const bySource = [...bySrc.entries()]
    .map(([source, r]) => ({ source, ...r }))
    .sort((a, b) => b.wonValue - a.wonValue || b.deals - a.deals);

  return { hasData: deals.length > 0, wonValue, wonCount, pipelineValue, openCount, lostCount, bySource };
}

export interface Funnel {
  clicks: number;
  leads: number;
  deals: number;
  won: number;
  clickToLead: number;
  leadToDeal: number;
  dealToWon: number;
}

/** Conversion funnel across the four stages. Rates are 0 when the prior stage is 0. */
export function summarizeFunnel(clicks: number, leads: number, deals: number, won: number): Funnel {
  return {
    clicks, leads, deals, won,
    clickToLead: clicks > 0 ? leads / clicks : 0,
    leadToDeal: leads > 0 ? deals / leads : 0,
    dealToWon: deals > 0 ? won / deals : 0,
  };
}
