import type { PostFormat } from "@/lib/supabase/types";

/**
 * Turn a Marketing Agent reel script (ordered beats) into a concrete storyboard:
 * one scene per beat, each with its on-screen overlay text, a filming/voiceover
 * direction, an assigned photo, and a duration. This is pure + deterministic so
 * it doubles as a film-it-yourself shot list when no render provider is set.
 */

export interface ReelScene {
  index: number;
  /** Short overlay text shown on screen for this scene. */
  onScreenText: string;
  /** What to film / say (voiceover or b-roll direction). */
  direction: string;
  /** Photo assigned to this scene, if any are available. */
  photoUrl: string | null;
  durationSec: number;
}

export interface Storyboard {
  scenes: ReelScene[];
  totalSec: number;
  aspect: "9:16";
  headline: string;
  caption: string;
  cta: string;
}

const DEFAULT_SECONDS = 3;

/**
 * Split one reel beat into overlay text + direction. Handles the common shapes:
 *   "[Over-asking again] — film the sold sign"  → text="Over-asking again"
 *   "Hook: we lost a house by $130k"            → text="Hook" ... no — see below
 *   "Walk up to the front door"                 → text=whole, direction=""
 * A bracketed prefix is always the overlay; otherwise we split on the first
 * em/en-dash (the script convention), falling back to a colon, else no split.
 */
export function parseBeat(beat: string): { onScreenText: string; direction: string } {
  const s = (beat ?? "").trim();
  if (!s) return { onScreenText: "", direction: "" };

  const bracket = s.match(/^\[([^\]]+)\]\s*[—–-]?\s*(.*)$/);
  if (bracket) {
    return { onScreenText: bracket[1].trim(), direction: bracket[2].trim() };
  }
  const dash = s.split(/\s+[—–]\s+/); // em/en dash with spaces
  if (dash.length > 1) {
    return { onScreenText: dash[0].trim(), direction: dash.slice(1).join(" — ").trim() };
  }
  const colon = s.match(/^([^:]{1,40}):\s*(.+)$/);
  if (colon) {
    return { onScreenText: colon[1].trim(), direction: colon[2].trim() };
  }
  return { onScreenText: s, direction: "" };
}

/** Clamp a per-scene duration into a sensible reel range (2–6s). */
function clampDuration(sec: number): number {
  if (!isFinite(sec)) return DEFAULT_SECONDS;
  return Math.min(6, Math.max(2, Math.round(sec)));
}

/**
 * Build a storyboard from a reel script. Photos are distributed across scenes in
 * order, repeating if there are more scenes than photos (and none if there are
 * no photos — the scenes are still a valid shot list).
 */
export function buildStoryboard(input: {
  reelScript: string[];
  photoUrls?: string[];
  headline?: string;
  caption?: string;
  cta?: string;
  secondsPerScene?: number;
}): Storyboard {
  const beats = (input.reelScript ?? []).map((b) => String(b)).filter((b) => b.trim().length > 0);
  const photos = (input.photoUrls ?? []).filter(Boolean);
  const per = clampDuration(input.secondsPerScene ?? DEFAULT_SECONDS);

  const scenes: ReelScene[] = beats.map((beat, i) => {
    const { onScreenText, direction } = parseBeat(beat);
    return {
      index: i,
      onScreenText,
      direction,
      photoUrl: photos.length ? photos[i % photos.length] : null,
      durationSec: per,
    };
  });

  return {
    scenes,
    totalSec: scenes.reduce((t, s) => t + s.durationSec, 0),
    aspect: "9:16",
    headline: (input.headline ?? "").trim(),
    caption: (input.caption ?? "").trim(),
    cta: (input.cta ?? "").trim(),
  };
}

/** A reel storyboard only makes sense for the reel format. */
export function isReelFormat(format?: PostFormat): boolean {
  return format === "reel";
}

/** Render the storyboard as a plain-text shot list (manual-export fallback). */
export function storyboardToText(sb: Storyboard): string {
  const lines = [
    sb.headline ? `REEL — ${sb.headline}` : "REEL",
    `~${sb.totalSec}s · ${sb.aspect} · ${sb.scenes.length} scenes`,
    "",
  ];
  for (const s of sb.scenes) {
    lines.push(`Scene ${s.index + 1} (${s.durationSec}s)`);
    if (s.onScreenText) lines.push(`  On screen: ${s.onScreenText}`);
    if (s.direction) lines.push(`  Film/say:  ${s.direction}`);
    lines.push("");
  }
  if (sb.cta) lines.push(`CTA: ${sb.cta}`);
  if (sb.caption) lines.push("", "Caption:", sb.caption);
  return lines.join("\n");
}
