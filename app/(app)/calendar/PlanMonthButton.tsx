"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MIX_LABELS } from "@/lib/agents/calendar";

/** Default slider weights, mirroring the research-based content mix (as %). */
const DEFAULT_MIX: Record<string, number> = {
  educational: 28,
  community: 22,
  social_proof: 18,
  personal_brand: 18,
  listings: 12,
};

const BUCKET_ORDER = ["educational", "community", "listings", "social_proof", "personal_brand"];

/**
 * Generate a month of draft posts balanced to the content-mix ratios. A settings
 * panel lets the agent dial how much of each content type appears that month
 * (e.g. more educational, fewer listings). Everything lands in the approval
 * queue — nothing auto-publishes.
 */
export function PlanMonthButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [count, setCount] = useState(20);
  const [mix, setMix] = useState<Record<string, number>>(DEFAULT_MIX);

  const total = BUCKET_ORDER.reduce((s, k) => s + (mix[k] ?? 0), 0);

  async function plan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, mix }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Planning failed");
      setShowSettings(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  /** Live preview: how many posts each bucket gets at the current weights. */
  function slotsFor(bucket: string): number {
    if (total <= 0) return 0;
    return Math.round(((mix[bucket] ?? 0) / total) * count);
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          aria-label="Content mix settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-paper-line text-ink-soft transition-colors hover:border-gold/60 hover:text-ink"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7.5 3.5a.75.75 0 011.5 0v.69a.75.75 0 001.5 0V3.5a.75.75 0 011.5 0v.69a2.25 2.25 0 010 4.37v7.69a.75.75 0 01-1.5 0V8.56a2.25 2.25 0 010-4.37V3.5zM4 3.5a.75.75 0 011.5 0v7.69a2.25 2.25 0 010 4.37v.69a.75.75 0 01-1.5 0v-.69a2.25 2.25 0 010-4.37V3.5zM14.5 3.5a.75.75 0 011.5 0v.69a2.25 2.25 0 010 4.37v7.69a.75.75 0 01-1.5 0V8.56a2.25 2.25 0 010-4.37V3.5z" />
          </svg>
        </button>
        <Button variant="gold" onClick={plan} disabled={busy}>
          {busy ? "Planning your month…" : "Plan 30 days"}
        </Button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}

      {showSettings && (
        <div className="absolute right-0 top-11 z-20 w-80 rounded-xl2 border border-paper-line bg-white p-4 text-left shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-navy">Content mix</h3>
            <button
              type="button"
              onClick={() => setMix(DEFAULT_MIX)}
              className="text-xs font-semibold text-gold-deep hover:underline"
            >
              Reset
            </button>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Dial how much of each type appears this month. Shares are balanced
            automatically.
          </p>

          <div className="mt-3 space-y-3">
            {BUCKET_ORDER.map((bucket) => {
              const meta = MIX_LABELS[bucket];
              const pct = total > 0 ? Math.round(((mix[bucket] ?? 0) / total) * 100) : 0;
              return (
                <div key={bucket}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-ink">{meta.label}</span>
                    <span className="text-xs tabular-nums text-ink-muted">
                      {pct}% · {slotsFor(bucket)} post{slotsFor(bucket) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={mix[bucket] ?? 0}
                    onChange={(e) =>
                      setMix((m) => ({ ...m, [bucket]: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-gold"
                  />
                  <p className="text-[11px] text-ink-muted">{meta.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-paper-line pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink">Posts this month</span>
              <span className="text-xs tabular-nums text-ink-muted">{count}</span>
            </div>
            <input
              type="range"
              min={4}
              max={40}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full accent-gold"
            />
          </div>

          {total <= 0 && (
            <p className="mt-2 text-xs text-error">
              Set at least one type above zero.
            </p>
          )}

          <Button
            variant="gold"
            onClick={plan}
            disabled={busy || total <= 0}
            className="mt-4 w-full"
          >
            {busy ? "Planning…" : `Plan ${count} posts`}
          </Button>
        </div>
      )}
    </div>
  );
}
