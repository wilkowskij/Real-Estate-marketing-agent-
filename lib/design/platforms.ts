// Per-platform output sizes. Posts are rendered at the target size before
// they reach the publish queue.

export type PlatformSize = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const PLATFORM_SIZES: Record<string, PlatformSize> = {
  ig_square: { key: "ig_square", label: "Instagram Square", width: 1080, height: 1080 },
  ig_portrait: { key: "ig_portrait", label: "Instagram Portrait", width: 1080, height: 1350 },
  ig_story: { key: "ig_story", label: "Instagram / FB Story", width: 1080, height: 1920 },
  fb_feed: { key: "fb_feed", label: "Facebook Feed", width: 1200, height: 630 },
  linkedin: { key: "linkedin", label: "LinkedIn", width: 1200, height: 627 },
};

export const DEFAULT_SIZE = PLATFORM_SIZES.ig_portrait;
