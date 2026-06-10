"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Downloads a CSV of all scheduled posts for the current 7-day window. */
export function ExportButton() {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const from = new Date().toISOString().slice(0, 10);
      // +6 days gives an inclusive 7-day range [today, today+6]
      const to   = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res  = await fetch(`/api/posts/export?from=${from}&to=${to}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Export failed");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = href;
      a.download = `posts-${from}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 100);
    } catch (e: any) {
      setError(e.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" size="sm" onClick={download} disabled={busy}>
        {busy ? "Exporting…" : "Export week CSV"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
