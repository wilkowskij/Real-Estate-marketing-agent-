// Hand-maintained subset of the DB types the app relies on.
// In a full build these are generated via `supabase gen types typescript`.

export type MemberRole = "owner" | "admin" | "member";
export type CampaignType =
  | "just_sold"
  | "new_listing"
  | "open_house"
  // High-traffic content types from the NJ / Monmouth County market research.
  | "market_stat"
  | "neighborhood_spotlight"
  | "deal_of_week"
  | "before_after"
  | "educational"
  | "testimonial"
  | "custom";

/**
 * Delivery format. Research ranks short video (Reels) > carousel > data
 * infographic > single image. The agent recommends a format per content type;
 * the design layer renders accordingly (Reels/carousels produce a script /
 * slide breakdown rather than a single static graphic).
 */
export type PostFormat = "reel" | "carousel" | "infographic" | "single_image";
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

/**
 * The geographic market an agent/org works in. Drives the AI's local expertise
 * (towns, commute patterns, hashtags) and the Stop-Slop local-specificity check,
 * so marketing copy is tailored to wherever the user actually sells — not a
 * hardcoded region.
 */
export interface MarketArea {
  /** Two-letter state code, e.g. "NJ", "TX", "CA". */
  state: string;
  /** County name without the word "County", e.g. "Monmouth", "Travis". */
  county: string;
  /** Optional informal region label, e.g. "Jersey Shore", "Bay Area". */
  region?: string;
  /** Key towns/neighborhoods the agent serves (used for hyperlocal angles). */
  towns: string[];
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
  market_area: MarketArea;
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
  /** Recommended delivery format for this content (research-driven). */
  format?: PostFormat;
  /**
   * For format === "reel": an ordered shot list / spoken script (each line is a
   * beat: on-screen text + what to film/say). Empty for non-video formats.
   */
  reel_script?: string[];
  /**
   * For format === "carousel": one entry per slide (6-13 slides perform best).
   * Empty for non-carousel formats.
   */
  carousel_slides?: string[];
}

/**
 * Marketing channel. "social" is the post pipeline (graphic + caption); "email"
 * and "sms" are direct-to-contact nurture messages with their own copy shapes.
 */
export type MarketingChannel = "social" | "email" | "sms";

/** Structured email copy — subject + inbox preview + body + CTA. */
export interface EmailCopy {
  subject: string;
  /** Inbox preview / preheader text (~40-90 chars). */
  preview: string;
  /** Body with paragraph line breaks. Plain text the agent can paste or template. */
  body: string;
  cta: string;
  compliance_notes: string[];
}

/** Structured SMS copy — one short message, optional follow-up. */
export interface SmsCopy {
  /** The text message. Kept under ~320 chars (2 SMS segments). */
  message: string;
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

export type CampaignStatus = "active" | "completed" | "archived";

/**
 * Campaign object — a named, multi-channel marketing campaign that groups social
 * posts + email/SMS messages around a listing or theme, with a strategy.
 */
export interface MarketingCampaign {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  listing_id: string | null;
  objective: string | null;
  status: CampaignStatus;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

/** A persisted email/SMS piece belonging to a campaign. */
export interface CampaignMessage {
  id: string;
  org_id: string;
  marketing_campaign_id: string | null;
  created_by: string | null;
  channel: "email" | "sms";
  campaign_type: CampaignType;
  content: EmailCopy | SmsCopy;
  state: "draft" | "approved" | "sent";
  created_at: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

/** A public lead-capture form / landing page. */
export interface LeadForm {
  id: string;
  org_id: string;
  created_by: string;
  slug: string;
  title: string;
  kind: "general" | "open_house" | "listing";
  listing_id: string | null;
  marketing_campaign_id: string | null;
  headline: string | null;
  subhead: string | null;
  active: boolean;
  created_at: string;
}

/** A captured lead with a simple CRM status pipeline. */
export interface Lead {
  id: string;
  org_id: string;
  lead_form_id: string | null;
  listing_id: string | null;
  marketing_campaign_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
}

export type FeedbackType = "bug" | "feedback" | "feature";
export type FeedbackStatus = "new" | "triaged" | "planned" | "done" | "wont_do";

/** An in-app support/feedback submission, optionally mirrored to Notion. */
export interface Feedback {
  id: string;
  org_id: string;
  created_by: string;
  type: FeedbackType;
  subject: string;
  message: string;
  contact_email: string | null;
  page_url: string | null;
  status: FeedbackStatus;
  notion_page_id: string | null;
  notion_synced_at: string | null;
  created_at: string;
}

export type DealStage =
  | "prospect"
  | "appointment"
  | "agreement"
  | "under_contract"
  | "closed_won"
  | "closed_lost";

/** A lead that progressed toward a closing, with durable attribution. */
export interface Deal {
  id: string;
  org_id: string;
  created_by: string;
  lead_id: string | null;
  marketing_campaign_id: string | null;
  listing_id: string | null;
  title: string;
  value: number | null;
  stage: DealStage;
  source: string | null;
  closed_at: string | null;
  created_at: string;
}

/** A short link that logs a click then redirects (for post→click attribution). */
export interface TrackedLink {
  id: string;
  org_id: string;
  created_by: string;
  slug: string;
  destination: string;
  label: string | null;
  marketing_campaign_id: string | null;
  clicks: number;
  created_at: string;
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
