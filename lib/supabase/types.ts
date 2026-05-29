// Hand-maintained subset of the DB types the app relies on.
// In a full build these are generated via `supabase gen types typescript`.

export type MemberRole = "owner" | "admin" | "member";
export type CampaignType = "just_sold" | "new_listing" | "open_house" | "custom";
export type PostState = "draft" | "approved" | "scheduled" | "published" | "failed";
export type ListingStatus = "active" | "pending" | "sold" | "coming_soon";
export type BrandOwner = "org" | "member";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface ContactBlock {
  phone?: string;
  email?: string;
  website?: string;
}

export interface BrandKit {
  id: string;
  org_id: string;
  owner: BrandOwner;
  membership_id: string | null;
  name: string;
  logo_light_path: string | null;
  logo_dark_path: string | null;
  colors: BrandColors;
  fonts: BrandFonts;
  disclaimer: string | null;
  layout_theme: string;
  locked_fields: string[];
  is_default: boolean;
}

export interface Profile {
  user_id: string;
  full_name: string | null;
  license_number: string | null;
  headshot_path: string | null;
  contact_block: ContactBlock;
}

export interface Listing {
  id: string;
  org_id: string;
  address: string;
  town: string | null;
  state: string;
  county: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: ListingStatus;
  description: string | null;
}

export interface CopyPackage {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  compliance_notes: string[];
}

export interface Asset {
  id: string;
  org_id: string;
  listing_id: string | null;
  storage_path: string;
  kind: "photo" | "ai_enhanced" | "rendered";
  width: number | null;
  height: number | null;
  meta: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  org_id: string;
  created_by: string;
  listing_id: string | null;
  type: CampaignType;
  copy: CopyPackage;
  brand_kit_id: string | null;
  rendered_asset_id: string | null;
  status: string;
}

export type Platform = "instagram" | "facebook" | "linkedin" | "x";

export interface Post {
  id: string;
  org_id: string;
  campaign_id: string | null;
  platform: Platform;
  caption: string | null;
  media_paths: string[];
  scheduled_at: string | null;
  state: PostState;
  platform_post_id: string | null;
  error: string | null;
}

export interface SocialAccount {
  id: string;
  org_id: string;
  owner: BrandOwner;
  membership_id: string | null;
  platform: Platform;
  account_label: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  /** Platform identifiers the publishers need (igUserId, pageId, personUrn, …). */
  meta: Record<string, unknown>;
}

export interface RecurringJob {
  id: string;
  org_id: string;
  kind: "local_news" | "trend_watch";
  cadence: string;
  config: Record<string, unknown>;
  auto_publish: boolean;
  enabled: boolean;
  last_run_at: string | null;
}
