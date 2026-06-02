"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea } from "@/components/ui/Field";

/** Create a new campaign object via a small modal dialog. */
export function NewCampaignButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (name.trim().length < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective: objective || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not create");
      setOpen(false);
      setName("");
      setObjective("");
      router.push(`/campaigns/${json.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="gold" onClick={() => setOpen(true)}>
        New campaign
      </Button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl2 border border-paper-line bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl text-navy">New campaign</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Name it, set the strategy, then attach content from across channels.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Label>Campaign name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="14 Riverside Ave — Just Sold push"
                  autoFocus
                />
              </div>
              <div>
                <Label>Strategy / objective (optional)</Label>
                <Textarea
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Generate seller leads in Red Bank by showcasing a quick over-asking sale across IG, email, and SMS."
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="gold" onClick={create} disabled={busy || name.trim().length < 1}>
                {busy ? "Creating…" : "Create campaign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
