"use client";

import { useState } from "react";

export interface SavedListing {
  id: string;
  address: string;
  town: string | null;
  state: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string | null;
  mls_number: string | null;
  source: string;
}

const money = (n: number | null) =>
  n == null ? "" : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

/**
 * "My listings" picker: lists the org's saved listings (manual or MLS-imported)
 * and hands the chosen one back to the generator so a property can be reused
 * across campaigns without re-entering it.
 */
export function SavedListings({ onSelect }: { onSelect: (l: SavedListing) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<SavedListing[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listings");
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't load listings");
      setListings(json.listings ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openPicker() {
    setOpen(true);
    void load();
  }

  function pick(l: SavedListing) {
    onSelect(l);
    setOpen(false);
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setListings((prev) => (prev ? prev.filter((l) => l.id !== id) : prev));
    } catch {
      setError("Couldn't delete that listing.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line px-3 py-1.5 text-xs font-semibold text-gold-deep transition-colors hover:border-gold/60"
      >
        ▤ My listings
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-50 mt-6 w-full max-w-lg rounded-xl2 border border-paper-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-navy">My listings</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-ink-muted hover:bg-paper hover:text-ink">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Pick a saved property to reuse it. Save listings from the “Import from MLS” search.
            </p>

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {busy && <p className="text-sm text-ink-muted">Loading…</p>}
              {!busy && listings && listings.length === 0 && (
                <p className="text-sm text-ink-muted">
                  No saved listings yet. Use “Import from MLS” and hit Save on a result.
                </p>
              )}
              {!busy &&
                listings?.map((l) => (
                  <div
                    key={l.id}
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
                        {l.source === "mls" ? " · MLS" : ""}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-3">
                      {l.price != null && <span className="text-sm font-semibold text-navy">{money(l.price)}</span>}
                      <button
                        type="button"
                        onClick={() => remove(l.id)}
                        disabled={deletingId === l.id}
                        aria-label="Delete listing"
                        className="rounded-lg p-1 text-ink-muted hover:bg-paper hover:text-error"
                      >
                        {deletingId === l.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
