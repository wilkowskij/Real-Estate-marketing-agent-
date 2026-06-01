import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { BillingClient } from "./BillingClient";

export const dynamic = "force-dynamic";

/**
 * Billing & plans. Shows the org's current plan, lets admins upgrade via Stripe
 * Checkout or manage via the Customer Portal. Org-level (billing belongs to the
 * org, not the individual agent).
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-4xl text-navy">Plans &amp; billing</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Pick the plan that fits your business. Upgrade, downgrade, or cancel any
        time — billing is handled securely by Stripe.
      </p>

      {searchParams.status === "success" && (
        <p className="mt-4 rounded-lg bg-gold/15 px-4 py-3 text-sm text-ink">
          Subscription updated — thank you! It may take a moment to reflect.
        </p>
      )}
      {searchParams.status === "cancelled" && (
        <p className="mt-4 rounded-lg bg-paper-card px-4 py-3 text-sm text-ink-muted">
          Checkout cancelled — no changes were made.
        </p>
      )}

      <BillingClient
        currentPlan={ctx.subscription.plan}
        status={ctx.subscription.status}
        canManage={canManage}
        hasCustomer={Boolean(ctx.subscription.stripeCustomerId)}
      />
    </div>
  );
}
