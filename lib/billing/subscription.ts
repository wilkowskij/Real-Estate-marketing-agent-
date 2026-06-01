import { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "./plans";

export interface OrgSubscription {
  plan: PlanId;
  status: string;
  active: boolean;            // true when the plan entitles paid features
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
 */
export async function getOrgSubscription(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSubscription> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, seats, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) {
    return {
      plan: "free",
      status: "inactive",
      active: true, // free tier is usable
      seats: PLANS.free.seats,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
    };
  }

  const plan = (data.plan as PlanId) in PLANS ? (data.plan as PlanId) : "free";
  return {
    plan,
    status: data.status,
    active: plan === "free" || PAID_STATUSES.has(data.status),
    seats: data.seats ?? PLANS[plan].seats,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    stripeCustomerId: data.stripe_customer_id,
  };
}

/** Has the org used up its monthly AI-campaign allowance? null limit = unlimited. */
export async function aiCampaignsRemaining(
  supabase: SupabaseClient,
  orgId: string,
  plan: PlanId
): Promise<number | null> {
  const limit = PLANS[plan].aiCampaigns;
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
