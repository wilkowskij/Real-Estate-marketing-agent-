import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { planForPriceId, PLANS, type PlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * Stripe webhook. Verifies the signature, dedupes by event id, and reconciles
 * the org's subscription row + orgs.plan. Uses the service-role client (no user
 * session). Required events: checkout.session.completed,
 * customer.subscription.{created,updated,deleted}, invoice.{paid,payment_failed}.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Signature verification needs the raw body.
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e.message}` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Idempotency: insert the event id; if it already exists, we've handled it.
  const { error: dupeErr } = await supabase
    .from("billing_events")
    .insert({ stripe_event_id: event.id, type: event.type, payload: event as any });
  if (dupeErr) {
    // Unique violation → already processed; ack so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orgId = s.metadata?.org_id;
        if (orgId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await reconcile(supabase, orgId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId =
          sub.metadata?.org_id ?? (await orgIdForCustomer(supabase, sub.customer as string));
        if (orgId) await reconcile(supabase, orgId, sub, event.type === "customer.subscription.deleted");
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const orgId = await orgIdForCustomer(supabase, inv.customer as string);
        if (orgId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("org_id", orgId);
        }
        break;
      }
      // invoice.paid is informational here; subscription.updated carries state.
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function orgIdForCustomer(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.org_id ?? null;
}

/** Write the canonical subscription state for an org and sync orgs.plan. */
async function reconcile(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orgId: string,
  sub: Stripe.Subscription,
  deleted = false
) {
  const priceId = sub.items.data[0]?.price.id;
  const plan: PlanId = deleted ? "free" : (priceId && planForPriceId(priceId)) || "free";
  const periodEnd = (sub as any).current_period_end as number | undefined;

  await supabase.from("subscriptions").upsert(
    {
      org_id: orgId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      plan,
      status: deleted ? "canceled" : sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      seats: PLANS[plan].seats,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  // Mirror the plan onto orgs.plan for quick gating reads.
  await supabase.from("orgs").update({ plan }).eq("id", orgId);
}
