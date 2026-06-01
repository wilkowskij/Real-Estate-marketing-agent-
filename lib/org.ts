import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveBrand, type ResolvedBrand } from "@/lib/branding/resolveBrand";
import { getOrgSubscription, type OrgSubscription } from "@/lib/billing/subscription";
import type { BrandKit, Profile } from "@/lib/supabase/types";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: string;
  orgKit: BrandKit;
  memberKit: BrandKit | null;
  profile: Profile | null;
  brand: ResolvedBrand;
  subscription: OrgSubscription;
}

/**
 * Load the signed-in user's primary org, their brand kits, profile, and the
 * already-resolved brand. Returns null if not authenticated.
 *
 * For simplicity we use the user's first membership as the active org; a real
 * build would let the user switch active orgs.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (!membership) return null;

  const [{ data: kits }, { data: profile }, subscription] = await Promise.all([
    supabase.from("brand_kits").select("*").eq("org_id", membership.org_id),
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    getOrgSubscription(supabase, membership.org_id),
  ]);

  const orgKit = (kits ?? []).find((k) => k.owner === "org" && k.is_default) as BrandKit;
  const memberKit =
    ((kits ?? []).find(
      (k) => k.owner === "member" && k.membership_id === membership.id && k.is_default
    ) as BrandKit) ?? null;

  const brand = resolveBrand({ orgKit, memberKit, profile: profile as Profile | null });

  return {
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role,
    orgKit,
    memberKit,
    profile: (profile as Profile) ?? null,
    brand,
    subscription,
  };
}
