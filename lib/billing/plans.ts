/**
 * Plan catalog — the single source of truth for pricing, features, seat limits,
 * and the Stripe Price ID each plan maps to. The UI (pricing page) and the
 * server (plan gating) both read from here so they never drift.
 *
 * Stripe Price IDs come from env so the same code works across test/live keys.
 */
export type PlanId = "free" | "starter" | "pro" | "team" | "brokerage";

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in USD (display only; Stripe is the source of truth). */
  monthly: number;
  /** Seat allowance; null = unlimited. */
  seats: number | null;
  /** Soft monthly AI-generation allowance (enforced via usage records). */
  aiCampaigns: number | null;
  blurb: string;
  features: string[];
  /** Env var holding this plan's Stripe Price ID (undefined for free). */
  priceEnv?: string;
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthly: 0,
    seats: 1,
    aiCampaigns: 3,
    blurb: "Try the studio.",
    features: ["1 user", "3 AI campaigns / mo", "Manual export"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 49,
    seats: 1,
    aiCampaigns: 20,
    blurb: "For the solo agent.",
    features: ["Single user", "20 AI campaigns / mo", "Social publishing", "Basic analytics"],
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Professional",
    monthly: 99,
    seats: 1,
    aiCampaigns: null,
    blurb: "Everything a working agent needs.",
    features: [
      "Unlimited campaigns",
      "CRM + lead capture",
      "AI content + image generation",
      "Social publishing",
      "Video generation",
    ],
    priceEnv: "STRIPE_PRICE_PRO",
    popular: true,
  },
  team: {
    id: "team",
    name: "Team",
    monthly: 249,
    seats: 10,
    aiCampaigns: null,
    blurb: "For a real estate team.",
    features: ["Up to 10 users", "Team reporting", "Shared assets", "Shared CRM"],
    priceEnv: "STRIPE_PRICE_TEAM",
  },
  brokerage: {
    id: "brokerage",
    name: "Brokerage",
    monthly: 499,
    seats: null,
    aiCampaigns: null,
    blurb: "Multi-office, white-labeled.",
    features: ["Unlimited users", "White label", "Brokerage reporting", "API access"],
    priceEnv: "STRIPE_PRICE_BROKERAGE",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "team", "brokerage"];

export function planRank(id: PlanId): number {
  return PLAN_ORDER.indexOf(id);
}

/** Resolve the Stripe Price ID for a paid plan from env, or null if unset. */
export function priceIdFor(id: PlanId): string | null {
  const env = PLANS[id]?.priceEnv;
  return env ? process.env[env] ?? null : null;
}

/** Map a Stripe Price ID back to a PlanId (for webhook handling). */
export function planForPriceId(priceId: string): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (PLANS[id].priceEnv && process.env[PLANS[id].priceEnv!] === priceId) return id;
  }
  return null;
}
