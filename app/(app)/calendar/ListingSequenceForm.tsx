"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook",  label: "Facebook"  },
  { value: "linkedin",  label: "LinkedIn"  },
  { value: "x",         label: "X / Twitter" },
];

/**
 * Inline form that fires a 5-post listing sequence:
 * Announce (Day 0) → Feature (Day 3) → Neighborhood (Day 7) →
 * Market stat (Day 10) → Follow-up (Day 14).
 * All posts land in the approval queue as drafts.
 */
export function ListingSequenceForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [address,  setAddress]  = useState("");
  const [town,     setTown]     = useState("");
  const [price,    setPrice]    = useState("");
  const [beds,     setBeds]     = useState("");
  const [baths,    setBaths]    = useState("");
  const [sqft,     setSqft]     = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [startDate, setStartDate] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
      const res = await fetch("/api/listings/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address:   address.trim(),
          town:      town.trim() || undefined,
          price:     num(price),
          beds:      num(beds),
          baths:     num(baths),
          sqft:      num(sqft),
          platform,
          startDate: startDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to create sequence");
      setSuccess(true);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => { setOpen((v) => !v); setSuccess(false); }}>
        {open ? "Cancel" : "📅 Start listing sequence"}
      </Button>

      {success && (
        <p className="mt-2 text-xs text-green-600">
          5 draft posts created and added to your approval queue.
        </p>
      )}

      {open && (
        <form
          onSubmit={submit}
          className="mt-4 space-y-3 rounded-xl border border-paper-line bg-white p-4"
        >
          <p className="text-sm font-medium text-navy">
            New listing sequence — 5 posts over 14 days
          </p>
          <p className="text-xs text-ink-muted">
            Announce (Day 0) → Feature (Day 3) → Neighborhood (Day 7) →
            Market stat (Day 10) → Follow-up (Day 14). All drafts land in your
            approval queue with pre-written captions you can edit or regenerate.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Address *</Label>
              <Input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="14 Riverside Ave"
              />
            </div>
            <div>
              <Label>Town</Label>
              <Input
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="Red Bank"
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1250000"
              />
            </div>
            <div>
              <Label>Beds</Label>
              <Input
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
              />
            </div>
            <div>
              <Label>Baths</Label>
              <Input
                type="number"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
              />
            </div>
            <div>
              <Label>Sq Ft</Label>
              <Input
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
              />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Start date (optional)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" variant="gold" size="sm" disabled={busy || !address.trim()}>
              {busy ? "Creating…" : "Create 5 drafts"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
