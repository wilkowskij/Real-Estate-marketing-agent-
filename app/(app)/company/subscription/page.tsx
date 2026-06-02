import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { BillingClient } from "@/components/billing/BillingClient";

export const dynamic = "force-dynamic";

/**
 * Company → Subscription. Shows the org's current plan and lets admins upgrade
 * via Stripe Checkout or manage payment details via the Customer Portal.
 * Billing is org-level (belongs to the company, not the individual agent).
 */
export default async function CompanySubscriptionPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div>
      <h2 className="text-2xl text-navy">Plans &amp; payment</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Pick the plan that fits your business. Upgrade, downgrade, or update your
        payment details any time — billing is handled securely by Stripe.
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

      <div className="mt-6">
        <BillingClient
          currentPlan={ctx.subscription.plan}
          status={ctx.subscription.status}
          canManage={canManage}
          hasCustomer={Boolean(ctx.subscription.stripeCustomerId)}
        />
      </div>
    </div>
  );
}
