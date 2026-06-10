/**
 * Analytics fetch layer. Mirrors the publisher pattern: every platform can
 * implement a MetricsFetcher that pulls engagement numbers for a published
 * post and normalizes them into a single PostMetrics shape.
 *
 * IMPORTANT: like publishing, reading insights from Instagram/Facebook (Meta
 * Graph API), LinkedIn, and X requires approved API access. Until a platform is
 * approved its fetcher returns null (a no-op), so the refresh cron simply skips
 * it. The schema, cron, and dashboard are all live now and start populating the
 * moment a platform's insights access lands — no rearchitecting.
 */

import type { PlatformAuth } from "./publisher";

/** Normalized per-post engagement snapshot. Null fields = not provided by the platform. */
export interface PostMetrics {
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  videoViews: number | null;
  /** The raw platform payload, kept for debugging / future fields. */
  raw: Record<string, unknown>;
}

export interface MetricsTarget {
  platform: string;
  /** The platform's id for the published post (posts.platform_post_id). */
  platformPostId: string;
}

export interface MetricsFetcher {
  readonly platform: string;
  /** Whether this fetcher can pull live insights (true) or is a stub (false). */
  readonly live: boolean;
  fetch(target: MetricsTarget, auth: PlatformAuth): Promise<PostMetrics | null>;
}

/** Empty snapshot helper so callers can normalize partial platform payloads. */
export function emptyMetrics(raw: Record<string, unknown> = {}): PostMetrics {
  return {
    impressions: null,
    reach: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    clicks: null,
    videoViews: null,
    raw,
  };
}

/**
 * Stub fetcher used for any platform whose insights API isn't approved yet.
 * Returns null so the cron skips writing a snapshot.
 */
class StubFetcher implements MetricsFetcher {
  constructor(readonly platform: string) {}
  readonly live = false;
  async fetch(): Promise<PostMetrics | null> {
    return null;
  }
}

const REGISTRY: Record<string, MetricsFetcher> = {
  instagram: new StubFetcher("instagram"),
  facebook: new StubFetcher("facebook"),
  linkedin: new StubFetcher("linkedin"),
  twitter: new StubFetcher("twitter"),
};

export function getMetricsFetcher(platform: string): MetricsFetcher {
  return REGISTRY[platform] ?? new StubFetcher(platform);
}

/** True if at least one platform has a live (non-stub) insights fetcher. */
export function anyLiveFetcher(): boolean {
  return Object.values(REGISTRY).some((f) => f.live);
}
