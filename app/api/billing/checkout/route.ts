import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { priceIdFor, seatPriceIdFor, PLANS, type PlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["solo", "team", "brokerage"]) });

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Start a Stripe Checkout session to subscribe the org to a plan. Admin-only
 * (billing is org-level). Reuses the org's existing Stripe customer if one
 * exists, else creates one and stores it on the subscription row.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can manage billing." }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const plan = parsed.data.plan as PlanId;
  const priceId = priceIdFor(plan);
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for ${plan}.` }, { status: 503 });
  }

  // Reuse an existing customer id if we have one for this org.
  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.profile?.contact_block?.email ?? undefined,
      metadata: { org_id: ctx.orgId },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ org_id: ctx.orgId, stripe_customer_id: customerId }, { onConflict: "org_id" });
  }

  // Per-seat overage: if the org already has more members than the plan's
  // included seats, add the additional-seat line item at the right quantity.
  const line_items: { price: string; quantity: number }[] = [{ price: priceId, quantity: 1 }];
  const seatPriceId = seatPriceIdFor(plan);
  if (seatPriceId && PLANS[plan].extraSeat) {
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId);
    const extra = Math.max(0, (count ?? 1) - PLANS[plan].seats);
    if (extra > 0) line_items.push({ price: seatPriceId, quantity: extra });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items,
    success_url: `${appUrl()}/company/subscription?status=success`,
    cancel_url: `${appUrl()}/company/subscription?status=cancelled`,
    // Carry org + plan so the webhook can reconcile even if metadata on the
    // subscription is delayed.
    metadata: { org_id: ctx.orgId, plan },
    subscription_data: { metadata: { org_id: ctx.orgId, plan } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
