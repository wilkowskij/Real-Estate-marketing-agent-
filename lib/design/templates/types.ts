import type { CampaignType, Listing } from "@/lib/supabase/types";
import type { ResolvedBrand } from "@/lib/branding/resolveBrand";

/** Everything a template needs to render one branded graphic. */
export interface TemplateProps {
  type: CampaignType;
  brand: ResolvedBrand;
  /** Public/signed URL of the hero photo. */
  photoUrl: string;
  /** Public/signed URL of the logo to draw (resolved light/dark by theme). */
  logoUrl?: string | null;
  /** Public/signed URL of the agent headshot. */
  headshotUrl?: string | null;
  listing?: Partial<Listing>;
  headline: string;
  width: number;
  height: number;
}

export function formatPrice(price?: number | null): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function badgeLabel(type: CampaignType): string {
  switch (type) {
    case "just_sold":
      return "JUST SOLD";
    case "new_listing":
      return "NEW LISTING";
    case "open_house":
      return "OPEN HOUSE";
    case "market_stat":
      return "MARKET UPDATE";
    case "neighborhood_spotlight":
      return "NEIGHBORHOOD";
    case "deal_of_week":
      return "DEAL OF THE WEEK";
    case "before_after":
      return "BEFORE & AFTER";
    case "educational":
      return "GOOD TO KNOW";
    case "testimonial":
      return "CLIENT STORY";
    default:
      return "FEATURED";
  }
}
