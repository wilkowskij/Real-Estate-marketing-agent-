import type { BrandKit, MarketArea, Profile } from "@/lib/supabase/types";
import { normalizeMarketArea } from "@/lib/branding/marketArea";

/**
 * The flattened brand object the Design Agent + templates consume.
 * Independent of whether the source was an org kit, a member kit, or a merge.
 */
export interface ResolvedBrand {
  name: string;
  logoLightPath: string | null;
  logoDarkPath: string | null;
  colors: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
  disclaimer: string | null;
  layoutTheme: string;
  /** The geographic market this brand sells in — drives the AI's local angle. */
  marketArea: MarketArea;
  agent: {
    fullName: string | null;
    licenseNumber: string | null;
    headshotPath: string | null;
    contact: { phone?: string; email?: string; website?: string };
  };
}

/** Brand-kit fields that an org admin can lock against member override. */
export const LOCKABLE_FIELDS = [
  "logo_light_path",
  "logo_dark_path",
  "colors",
  "fonts",
  "disclaimer",
  "layout_theme",
  "market_area",
] as const;
export type LockableField = (typeof LOCKABLE_FIELDS)[number];

/**
 * Resolve the final brand by layering a member's kit on top of the org kit.
 *
 * Rules:
 *  - Start from the org kit (the company default).
 *  - For each field, if the org locked it, the org value wins — members cannot
 *    override it. Otherwise a member kit value (when present) takes precedence.
 *  - The agent's personal identity (headshot, name, license, contact) always
 *    comes from their profile — it is never an org-locked, shared value.
 *
 * A solo agent is an org-of-one: their org kit has no locks, so they fully
 * control everything.
 */
export function resolveBrand(args: {
  orgKit: BrandKit;
  memberKit?: BrandKit | null;
  profile?: Profile | null;
}): ResolvedBrand {
  const { orgKit, memberKit, profile } = args;
  const locked = new Set(orgKit.locked_fields ?? []);

  const pick = <T>(field: LockableField, orgVal: T, memberVal: T | undefined): T => {
    if (locked.has(field)) return orgVal;
    return memberVal !== undefined && memberVal !== null ? memberVal : orgVal;
  };

  return {
    name: memberKit?.name ?? orgKit.name,
    logoLightPath: pick("logo_light_path", orgKit.logo_light_path, memberKit?.logo_light_path),
    logoDarkPath: pick("logo_dark_path", orgKit.logo_dark_path, memberKit?.logo_dark_path),
    colors: pick("colors", orgKit.colors, memberKit?.colors),
    fonts: pick("fonts", orgKit.fonts, memberKit?.fonts),
    disclaimer: pick("disclaimer", orgKit.disclaimer, memberKit?.disclaimer),
    layoutTheme: pick("layout_theme", orgKit.layout_theme, memberKit?.layout_theme),
    marketArea: normalizeMarketArea(
      pick("market_area", orgKit.market_area, memberKit?.market_area)
    ),
    agent: {
      fullName: profile?.full_name ?? null,
      licenseNumber: profile?.license_number ?? null,
      headshotPath: profile?.headshot_path ?? null,
      contact: profile?.contact_block ?? {},
    },
  };
}
