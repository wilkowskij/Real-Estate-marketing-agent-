"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useModalDismiss } from "@/lib/useModalDismiss";

export interface ImportedListing {
  /** RentCast/MLS listing id, when present — used to save + dedupe. */
  id?: string;
  address: string;
  town: string | null;
  state: string | null;
  zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string | null;
}

/** Map an MLS result to the /api/listings save payload. */
function saveBody(l: ImportedListing) {
  return {
    address: l.address,
    town: l.town ?? undefined,
    state: l.state ?? undefined,
    zip: l.zip ?? undefined,
    price: l.price ?? undefined,
    beds: l.beds ?? undefined,
    baths: l.baths ?? undefined,
    sqft: l.sqft ?? undefined,
    status: l.status === "Inactive" ? ("sold" as const) : ("active" as const),
    mlsNumber: l.id ?? undefined,
    source: "mls" as const,
  };
}

const money = (n: number | null) =>
  n == null ? "" : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

/**
 * MLS import: search RentCast for a property and hand the chosen listing back to
 * the generator, which pre-fills every field. Two clicks to a campaign: pick a
 * listing here, then Generate.
 */
export function MlsImport({ onSelect }: { onSelect: (l: ImportedListing) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportedListing[] | null>(null);
  const [area, setArea] = useState<{ label: string; mls: string | null } | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const dialogRef = useModalDismiss<HTMLDivElement>(open, () => setOpen(false));

  const keyFor = (l: ImportedListing, i: number) => l.id ?? `${l.address}-${i}`;

  async function save(l: ImportedListing, key: string) {
    setSavingKey(key);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveBody(l)),
      });
      if (!res.ok) throw new Error();
      setSavedKeys((prev) => new Set(prev).add(key));
    } catch {
      setError("Couldn't save that listing. Try again.");
    } finally {
      setSavingKey(null);
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/listings/search?q=${encodeURIComponent(q)}&status=${status}`);
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Search failed");
      setResults(json.listings ?? []);
      setArea(json.area ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function pick(l: ImportedListing) {
    onSelect(l);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line px-3 py-1.5 text-xs font-semibold text-gold-deep transition-colors hover:border-gold/60"
      >
        ⌂ Import from MLS
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div ref={dialogRef} role="dialog" aria-modal="true" className="relative z-50 mt-6 w-full max-w-lg rounded-xl2 border border-paper-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-navy">Import a listing</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-ink-muted hover:bg-paper hover:text-ink">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Search by address, ZIP, or “City, ST”. Pick one and we&apos;ll fill in the details.
            </p>

            <form onSubmit={search} className="mt-4 flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="14 Riverside Ave  ·  07701  ·  Red Bank, NJ"
                autoFocus
                className="h-11 flex-1 rounded-lg border border-paper-line bg-paper px-3 text-sm text-ink focus:border-gold focus:outline-none"
              />
              <Button type="submit" variant="gold" disabled={busy || q.trim().length < 2}>
                {busy ? "…" : "Search"}
              </Button>
            </form>

            <div className="mt-2 flex gap-2 text-xs">
              {(["Active", "Inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    status === s ? "bg-gold/15 text-gold-deep" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {s === "Active" ? "For sale" : "Recently sold"}
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            {area && (
              <p className="mt-3 text-xs text-ink-muted">
                {area.mls ? `${area.mls} · ` : ""}City searches default to {area.label}. Set your
                MLS and market area in Brand settings.
              </p>
            )}

            {results && (
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-sm text-ink-muted">No listings found. Try a different search.</p>
                ) : (
                  results.map((l, i) => {
                    const key = keyFor(l, i);
                    const isSaved = savedKeys.has(key);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-paper-line p-3 transition-colors hover:border-gold/60 hover:bg-paper"
                      >
                        <button type="button" onClick={() => pick(l)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-ink">{l.address}</p>
                          <p className="text-xs text-ink-muted">
                            {[l.town, l.state].filter(Boolean).join(", ")}
                            {l.beds != null || l.baths != null || l.sqft != null ? " · " : ""}
                            {[l.beds != null ? `${l.beds} bd` : null, l.baths != null ? `${l.baths} ba` : null, l.sqft != null ? `${l.sqft.toLocaleString()} sqft` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-3">
                          {l.price != null && <span className="text-sm font-semibold text-navy">{money(l.price)}</span>}
                          <button
                            type="button"
                            onClick={() => save(l, key)}
                            disabled={isSaved || savingKey === key}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                              isSaved
                                ? "border-transparent text-ink-muted"
                                : "border-paper-line text-gold-deep hover:border-gold/60"
                            }`}
                          >
                            {isSaved ? "Saved ✓" : savingKey === key ? "…" : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
