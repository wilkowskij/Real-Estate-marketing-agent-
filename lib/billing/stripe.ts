import Stripe from "stripe";

/**
 * Lazily-constructed Stripe client. Returns null when STRIPE_SECRET_KEY isn't
 * set, so the app builds and runs (billing routes return a clean "not
 * configured" error) before billing is wired up — same pattern as the image
 * provider. Never throws at import time.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  // Use the SDK's default pinned API version (omit apiVersion) to avoid coupling
  // the build to a specific literal; the installed SDK version controls it.
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
