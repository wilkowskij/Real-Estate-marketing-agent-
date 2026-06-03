"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PLANS, PLAN_ORDER, planRank, type PlanId } from "@/lib/billing/plans";

/**
 * Plan picker + manage-billing. Admins start a Stripe Checkout for a plan or
 * open the Customer Portal. Non-admins see read-only plan state.
 */
export function BillingClient({
  currentPlan,
  status,
  canManage,
  hasCustomer,
}: {
  currentPlan: PlanId;
  status: string;
  canManage: boolean;
  hasCustomer: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error?.toString?.() ?? "Could not start checkout");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  }

  async function portal() {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error?.toString?.() ?? "Could not open portal");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between rounded-xl2 border border-paper-line bg-paper-card p-5">
        <div>
          <p className="text-sm text-ink-muted">Current plan</p>
          <p className="font-display text-2xl text-navy">
            {PLANS[currentPlan].name}
            {status !== "active" && status !== "inactive" && (
              <span className="ml-2 align-middle">
                <Badge>{status}</Badge>
              </span>
            )}
          </p>
        </div>
        {canManage && hasCustomer && (
          <Button variant="secondary" onClick={portal} disabled={busy === "portal"}>
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLAN_ORDER.filter((id) => id !== "free").map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          const isUpgrade = planRank(id) > planRank(currentPlan);
          return (
            <Card key={id} className={plan.popular ? "ring-2 ring-gold" : undefined}>
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-navy">{plan.name}</h3>
                  {plan.popular && <Badge>Popular</Badge>}
                </div>
                <p className="text-3xl font-semibold text-navy">
                  ${plan.monthly}
                  <span className="text-sm font-normal text-ink-muted">/mo</span>
                </p>
                <p className="text-xs text-ink-muted">
                  {plan.seats === 1
                    ? "1 user"
                    : `Up to ${plan.seats} users`}
                  {plan.extraSeat ? ` · +$${plan.extraSeat}/extra user` : ""}
                </p>
                <p className="text-sm text-ink-muted">{plan.blurb}</p>
                <ul className="mt-1 space-y-1.5 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-gold-deep">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-3">
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : canManage ? (
                    <Button
                      variant={isUpgrade ? "gold" : "secondary"}
                      className="w-full"
                      onClick={() => checkout(id)}
                      disabled={busy === id}
                    >
                      {busy === id ? "…" : isUpgrade ? "Upgrade" : "Switch"}
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-ink-muted">Admins manage billing</p>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
