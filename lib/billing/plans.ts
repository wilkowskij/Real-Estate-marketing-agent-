/**
 * Plan catalog — the single source of truth for pricing, features, seat limits,
 * and the Stripe Price ID each plan maps to. The UI (pricing page) and the
 * server (plan gating) both read from here so they never drift.
 *
 * Pricing model (market-researched, 2026):
 *   - No "unlimited" tier — every plan has a finite AI-credit allowance and a
 *     finite included-seat count.
 *   - Team tiers include a block of seats for a flat price, then charge a
 *     per-additional-user price beyond the included block.
 *
 * Benchmarks used: Coffee & Contracts ($54 solo / $45 per user teams — content
 * templates only), Follow Up Boss CRM (~$69/user), Curaytor ($300–$650/mo),
 * Luxury Presence ($250–$1,700/mo), kvCORE/BoldTrail & Lofty ($449–$499+/mo
 * platforms). Marquee is an all-in-one (AI content + image + email/SMS + social
 * publishing + calendar + CRM/lead capture + revenue attribution + analytics),
 * so it sits above template tools and undercuts the heavy CRM platforms.
 *
 * Stripe Price IDs come from env so the same code works across test/live keys.
 */
export type PlanId = "free" | "solo" | "team" | "brokerage";

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly base price in USD (display only; Stripe is the source of truth). */
  monthly: number;
  /** Included seats for the base price (finite — no unlimited). */
  seats: number;
  /** Per-additional-user monthly price beyond the included seats (team tiers). */
  extraSeat?: number;
  /** Finite monthly AI-credit allowance (1 credit = 1 generation: post/email/SMS/image). */
  aiCampaigns: number;
  blurb: string;
  features: string[];
  /** Env var holding this plan's base Stripe Price ID (undefined for free). */
  priceEnv?: string;
  /** Env var holding the per-additional-seat Stripe Price ID (team tiers). */
  seatPriceEnv?: string;
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthly: 0,
    seats: 1,
    aiCampaigns: 5,
    blurb: "Try the studio.",
    features: ["1 user", "5 AI credits / mo", "Manual export"],
  },
  solo: {
    id: "solo",
    name: "Solo",
    monthly: 59,
    seats: 1,
    aiCampaigns: 40,
    blurb: "For the individual agent.",
    features: [
      "1 user",
      "40 AI credits / mo",
      "AI content, image, email & SMS",
      "Social publishing",
      "Lead capture + CRM",
    ],
    priceEnv: "STRIPE_PRICE_SOLO",
  },
  team: {
    id: "team",
    name: "Team",
    monthly: 399,
    seats: 10,
    extraSeat: 39,
    aiCampaigns: 400,
    blurb: "For a real estate team.",
    features: [
      "Up to 10 users included",
      "+$39 / additional user / mo",
      "400 AI credits / mo",
      "Everything in Solo",
      "Shared brand, assets & CRM",
      "Team analytics + revenue attribution",
    ],
    priceEnv: "STRIPE_PRICE_TEAM",
    seatPriceEnv: "STRIPE_PRICE_TEAM_SEAT",
    popular: true,
  },
  brokerage: {
    id: "brokerage",
    name: "Brokerage",
    monthly: 899,
    seats: 25,
    extraSeat: 32,
    aiCampaigns: 1200,
    blurb: "For multi-agent brokerages.",
    features: [
      "Up to 25 users included",
      "+$32 / additional user / mo",
      "1,200 AI credits / mo",
      "Everything in Team",
      "White-label branding",
      "Brokerage reporting + priority support",
    ],
    priceEnv: "STRIPE_PRICE_BROKERAGE",
    seatPriceEnv: "STRIPE_PRICE_BROKERAGE_SEAT",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "team", "brokerage"];

export function planRank(id: PlanId): number {
  return PLAN_ORDER.indexOf(id);
}

/** Resolve the base Stripe Price ID for a paid plan from env, or null if unset. */
export function priceIdFor(id: PlanId): string | null {
  const env = PLANS[id]?.priceEnv;
  return env ? process.env[env] ?? null : null;
}

/** Resolve the per-additional-seat Stripe Price ID for a plan from env, or null. */
export function seatPriceIdFor(id: PlanId): string | null {
  const env = PLANS[id]?.seatPriceEnv;
  return env ? process.env[env] ?? null : null;
}

/** Map a Stripe Price ID back to a PlanId (matches base prices only). */
export function planForPriceId(priceId: string): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (PLANS[id].priceEnv && process.env[PLANS[id].priceEnv!] === priceId) return id;
  }
  return null;
}

/**
 * Monthly total for a plan at a given user count: base price plus per-seat
 * overage for users beyond the included block. Pure — used by the UI estimator.
 */
export function monthlyForSeats(id: PlanId, users: number): number {
  const plan = PLANS[id];
  const extra = Math.max(0, users - plan.seats);
  return plan.monthly + (plan.extraSeat ?? 0) * extra;
}
