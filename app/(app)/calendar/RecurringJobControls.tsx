"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";

export interface RecurringJobRow {
  id: string;
  kind: "local_news" | "trend_watch";
  cadence: string;
  config: Record<string, unknown>;
  auto_publish: boolean;
  enabled: boolean;
}

/**
 * Wired controls for one recurring automation job. Toggles enabled/auto-publish,
 * picks a cadence, and edits the area/topic stored in config. Persists each
 * change via the upsert-by-kind API and refreshes the server view.
 */
export function RecurringJobControls({
  kind,
  job,
}: {
  kind: "local_news" | "trend_watch";
  job: RecurringJobRow | null;
}) {
  const router = useRouter();
  const config = (job?.config ?? {}) as { area?: string; topic?: string };

  const [open, setOpen] = useState(false);
  const [cadence, setCadence] = useState(job?.cadence ?? (kind === "trend_watch" ? "daily" : "weekly"));
  const [autoPublish, setAutoPublish] = useState(job?.auto_publish ?? false);
  const [area, setArea] = useState(config.area ?? "");
  const [topic, setTopic] = useState(config.topic ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = job?.enabled !== false;

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recurring-jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function saveConfig() {
    void save({
      cadence,
      auto_publish: autoPublish,
      config: {
        ...config,
        area: area || undefined,
        topic: topic || undefined,
      },
    });
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} disabled={busy}>
          {open ? "Close" : "Configure"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => save({ enabled: !enabled })}
          disabled={busy}
        >
          {enabled ? "Pause" : "Resume"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-paper-line pt-4">
          <div>
            <Label>Cadence</Label>
            <Select value={cadence} onChange={(e) => setCadence(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
          <div>
            <Label>Area</Label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Monmouth County, NJ"
            />
          </div>
          <div>
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="local real estate market update"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
            />
            Auto-publish without review
          </label>
          <div className="flex items-center justify-end gap-3">
            {error && <p className="text-xs text-error">{error}</p>}
            <Button variant="gold" size="sm" onClick={saveConfig} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
