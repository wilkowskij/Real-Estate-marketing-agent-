import { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "./plans";

export interface OrgSubscription {
  plan: PlanId;
  status: string;
  active: boolean;            // true when the plan entitles paid features
  trialing: boolean;          // true during the 14-day free trial
  trialEndsAt: string | null; // ISO timestamp of trial expiry
  seats: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

const PAID_STATUSES = new Set(["active", "trialing"]);

/**
 * Load an org's subscription. Defaults to the free plan when no row exists, so
 * callers always get a usable result. `active` reflects whether the plan should
 * unlock paid features (free is always "active" for its own small allowance).
 * `trialing` is true when within the 14-day free trial window.
 */
export async function getOrgSubscription(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSubscription> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, seats, current_period_end, cancel_at_period_end, stripe_customer_id, trial_ends_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) {
    return {
      plan: "free",
      status: "inactive",
      active: true, // free tier is usable
      trialing: false,
      trialEndsAt: null,
      seats: PLANS.free.seats,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
    };
  }

  const plan = (data.plan as PlanId) in PLANS ? (data.plan as PlanId) : "free";

  // A trialing subscription is one whose status is 'trialing' AND whose
  // trial_ends_at is in the future. Once the trial expires the row stays but
  // the user is gated to Free-tier limits until they subscribe.
  const trialEndsAt: string | null = data.trial_ends_at ?? null;
  const trialing =
    data.status === "trialing" && trialEndsAt != null && new Date(trialEndsAt) > new Date();

  return {
    plan,
    status: data.status,
    active: plan === "free" || PAID_STATUSES.has(data.status),
    trialing,
    trialEndsAt,
    seats: data.seats ?? PLANS[plan].seats,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    stripeCustomerId: data.stripe_customer_id,
  };
}

/**
 * How many AI-campaign credits remain this month for the org.
 * During a free trial the org gets Solo-tier limits (40/mo) instead of the
 * Free-tier limit (5/mo). null = unlimited (no plan cap).
 */
export async function aiCampaignsRemaining(
  supabase: SupabaseClient,
  orgId: string,
  subscription: OrgSubscription
): Promise<number | null> {
  // Trialing users get Solo-tier limits so they can evaluate the product fully.
  const effectivePlan: PlanId = subscription.trialing ? "solo" : subscription.plan;
  const limit = PLANS[effectivePlan].aiCampaigns;
  if (limit == null) return null; // unlimited
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_records")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("kind", "ai_generation")
    .gte("created_at", startOfMonth.toISOString());
  return Math.max(0, limit - (count ?? 0));
}

/** Record one unit of metered usage (best-effort; never throws to the caller). */
export async function recordUsage(
  supabase: SupabaseClient,
  orgId: string,
  kind: "ai_generation" | "image_generation" | "video_render" | "sms",
  quantity = 1,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from("usage_records").insert({ org_id: orgId, kind, quantity, meta });
  } catch {
    /* metering is best-effort */
  }
}
