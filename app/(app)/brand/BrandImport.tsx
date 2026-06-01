"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BrandColors } from "@/lib/supabase/types";

interface Extracted {
  name: string | null;
  colors: Partial<BrandColors>;
  fonts: { heading?: string; body?: string };
  disclaimer: string | null;
  voice: string | null;
  extraColors: string[];
}

/**
 * Admin-only: upload a brand-guidelines document (PDF / .md / .txt). Claude
 * extracts colors, fonts, disclaimer, and voice; the admin reviews and clicks
 * Apply to populate the brand form (which they then Save). Nothing is written
 * until the admin confirms.
 */
export function BrandImport({
  onApply,
}: {
  onApply: (e: Extracted) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extracted | null>(null);

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/brand/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Import failed");
      setResult(json.brand as Extracted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8">
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-lg text-navy">Import a brand guide</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Upload your company brand guidelines (PDF, .md, or .txt). We&apos;ll read it
            and fill in your colors, fonts, and disclaimer for you to review.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-paper-line py-6 text-center hover:border-gold/60">
          <span className="text-sm text-ink-soft">
            {busy ? "Reading your brand guide…" : "Click to upload a brand guide"}
          </span>
          <input
            type="file"
            accept=".pdf,.md,.markdown,.txt,application/pdf,text/plain,text/markdown"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPick(e.target.files)}
          />
        </label>

        {error && <p className="text-sm text-error">{error}</p>}

        {result && (
          <div className="space-y-3 rounded-lg bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Extracted from your guide
            </p>
            {result.name && <p className="text-sm text-ink">Brand: {result.name}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {(["primary", "secondary", "accent"] as const).map((k) =>
                result.colors[k] ? (
                  <span key={k} className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <span
                      className="inline-block h-5 w-5 rounded-full border border-paper-line"
                      style={{ backgroundColor: result.colors[k] }}
                    />
                    {k}: {result.colors[k]}
                  </span>
                ) : null
              )}
            </div>
            {(result.fonts.heading || result.fonts.body) && (
              <p className="text-sm text-ink-soft">
                Fonts: {result.fonts.heading ?? "—"} / {result.fonts.body ?? "—"}
              </p>
            )}
            {result.voice && <p className="text-sm text-ink-muted">Voice: {result.voice}</p>}
            {result.disclaimer && (
              <p className="text-sm text-ink-muted">Disclaimer: “{result.disclaimer}”</p>
            )}
            <Button variant="gold" size="sm" onClick={() => onApply(result)}>
              Apply to brand kit
            </Button>
            <p className="text-xs text-ink-muted">
              Review the fields below, then Save brand kit to apply for your whole team.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
