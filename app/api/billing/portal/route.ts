import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Open the Stripe Customer Portal so an admin can upgrade/downgrade, update
 * their card, cancel, or download invoices. Admin-only; requires an existing
 * Stripe customer (created during checkout).
 */
export async function POST(_req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can manage billing." }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  const customerId = ctx.subscription.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account yet — choose a plan first." },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/company/subscription`,
  });

  return NextResponse.json({ url: session.url });
}
