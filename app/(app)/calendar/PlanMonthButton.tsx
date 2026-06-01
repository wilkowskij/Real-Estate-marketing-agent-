"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Generate a month of draft posts balanced to the content-mix ratios. Lands them
 * in the approval queue (nothing auto-publishes). ~20 posts ≈ 5/week.
 */
export function PlanMonthButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function plan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 20 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Planning failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="gold" onClick={plan} disabled={busy}>
        {busy ? "Planning your month…" : "Plan 30 days"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
