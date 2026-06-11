"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/billing/plans";

/**
 * Full-screen upgrade prompt shown when the user hits their monthly AI-credit
 * limit (402 from the generate API). Presents the Solo and Team plans with
 * inline Stripe checkout; a "later" link dismisses without navigating away.
 */
export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: "solo" | "team") {
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

  const plans = [
    { id: "solo" as const, highlight: false },
    { id: "team" as const, highlight: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-paper shadow-lift">
        <div className="border-b border-paper-line px-8 py-6">
          <h2 className="font-display text-2xl text-navy">You've used all your credits</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upgrade to keep generating — your content and settings stay exactly as they are.
          </p>
        </div>

        <div className="grid gap-4 p-8 sm:grid-cols-2">
          {plans.map(({ id, highlight }) => {
            const plan = PLANS[id];
            return (
              <div
                key={id}
                className={`flex flex-col gap-3 rounded-xl border p-5 ${
                  highlight ? "border-gold ring-2 ring-gold/40" : "border-paper-line"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-navy">{plan.name}</h3>
                  {highlight && (
                    <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-3xl font-semibold text-navy">
                  ${plan.monthly}
                  <span className="text-sm font-normal text-ink-muted">/mo</span>
                </p>
                <ul className="space-y-1.5 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-gold-deep">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <Button
                    variant={highlight ? "gold" : "secondary"}
                    className="w-full"
                    onClick={() => checkout(id)}
                    disabled={busy !== null}
                  >
                    {busy === id ? "Opening checkout…" : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="px-8 pb-4 text-sm text-error">{error}</p>}

        <div className="flex items-center justify-between border-t border-paper-line px-8 py-4">
          <a
            href="/company/subscription"
            className="text-sm text-ink-muted hover:text-ink hover:underline"
          >
            View all plans
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink hover:underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
