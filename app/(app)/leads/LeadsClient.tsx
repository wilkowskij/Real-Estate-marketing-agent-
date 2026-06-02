"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";

export interface FormCard {
  id: string;
  slug: string;
  title: string;
  kind: string;
  active: boolean;
  url: string;
  qr: string;
}
export interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: string;
  formTitle: string | null;
  createdAt: string;
}
export interface DealItem {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  source: string | null;
  created_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
const DEAL_STAGES = ["prospect", "appointment", "agreement", "under_contract", "closed_won", "closed_lost"] as const;
const DEAL_STAGE_LABEL: Record<string, string> = {
  prospect: "Prospect",
  appointment: "Appointment",
  agreement: "Agreement",
  under_contract: "Under contract",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};
const KIND_LABEL: Record<string, string> = {
  general: "Landing page",
  open_house: "Open house",
  listing: "Listing",
};

export function LeadsClient({
  forms,
  leads,
  deals,
  hasOrigin,
}: {
  forms: FormCard[];
  leads: LeadRow[];
  deals: DealItem[];
  hasOrigin: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"general" | "open_house" | "listing">("open_house");
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function createForm() {
    if (title.trim().length < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          kind,
          headline: headline || undefined,
          subhead: subhead || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not create");
      setCreating(false);
      setTitle("");
      setHeadline("");
      setSubhead("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function convertToDeal(lead: LeadRow) {
    const title = lead.name || lead.email || lead.phone || "New deal";
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, leadId: lead.id }),
    });
    router.refresh();
  }

  async function updateDeal(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function toggleActive(form: FormCard) {
    await fetch(`/api/lead-forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !form.active }),
    });
    router.refresh();
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Capture forms */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg text-navy">Capture forms</h2>
        <Button variant="gold" size="sm" onClick={() => setCreating(true)}>
          New form
        </Button>
      </div>

      {!hasOrigin && (
        <p className="mt-2 text-xs text-warning">
          Set <code>NEXT_PUBLIC_APP_URL</code> in your environment so shareable
          links and QR codes use your real domain.
        </p>
      )}

      {forms.length === 0 ? (
        <Card className="mt-3">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No capture forms yet. Create an open-house sign-in or a listing
              landing page, then share its link or QR code.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {forms.map((f) => (
            <Card key={f.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg text-navy">{f.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-muted">{KIND_LABEL[f.kind] ?? f.kind}</p>
                  </div>
                  <Badge>{f.active ? "Live" : "Paused"}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-paper px-2 py-1.5 text-xs text-ink-soft">
                    {f.url}
                  </code>
                  <button
                    onClick={() => copy(f.url, f.id)}
                    className="text-xs font-semibold text-gold-deep hover:underline"
                  >
                    {copied === f.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-deep hover:underline">
                    Open ↗
                  </a>
                  {f.qr && (
                    <button onClick={() => setQrOpen(qrOpen === f.id ? null : f.id)} className="font-semibold text-gold-deep hover:underline">
                      {qrOpen === f.id ? "Hide QR" : "Show QR"}
                    </button>
                  )}
                  <button onClick={() => toggleActive(f)} className="font-semibold text-ink-soft hover:underline">
                    {f.active ? "Pause" : "Resume"}
                  </button>
                </div>

                {qrOpen === f.id && f.qr && (
                  <div className="mt-3 flex flex-col items-center rounded-lg bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.qr} alt={`QR code for ${f.title}`} className="h-44 w-44" />
                    <a href={f.qr} download={`${f.slug}-qr.png`} className="mt-2 text-xs font-semibold text-gold-deep hover:underline">
                      Download QR
                    </a>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Leads pipeline */}
      <h2 className="mt-10 font-display text-lg text-navy">Pipeline</h2>
      {leads.length === 0 ? (
        <Card className="mt-3">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No leads yet. Submissions from your forms show up here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-3">
          <CardBody className="divide-y divide-paper-line">
            {leads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{l.name || l.email || l.phone || "Unknown"}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {[l.email, l.phone].filter(Boolean).join(" · ")}
                    {l.formTitle ? ` · ${l.formTitle}` : ""}
                  </p>
                  {l.message && <p className="mt-1 text-xs text-ink-soft line-clamp-2">{l.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={l.status}
                    onChange={(e) => setStatus(l.id, e.target.value)}
                    className="h-9 w-32"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => convertToDeal(l)}
                    className="whitespace-nowrap rounded-lg border border-paper-line px-2.5 py-2 text-xs font-semibold text-gold-deep hover:border-gold/60"
                    title="Create a deal from this lead"
                  >
                    → Deal
                  </button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Deals pipeline */}
      <h2 className="mt-10 font-display text-lg text-navy">Deals</h2>
      {deals.length === 0 ? (
        <Card className="mt-3">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No deals yet. Click <span className="font-medium">→ Deal</span> on a lead to start
              tracking it toward a closing. Closed revenue is attributed by source in Analytics.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-3">
          <CardBody className="divide-y divide-paper-line">
            {deals.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{d.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {d.source ? d.source.replace(/_/g, " ") : "Unattributed"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-paper-line px-2">
                    <span className="text-xs text-ink-muted">$</span>
                    <input
                      type="number"
                      defaultValue={d.value ?? ""}
                      placeholder="value"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        updateDeal(d.id, { value: v === "" ? null : Number(v) });
                      }}
                      className="h-9 w-24 bg-transparent px-1 text-sm text-ink focus:outline-none"
                    />
                  </div>
                  <Select
                    value={d.stage}
                    onChange={(e) => updateDeal(d.id, { stage: e.target.value })}
                    className="h-9 w-40"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Create-form dialog */}
      {creating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={() => setCreating(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl2 border border-paper-line bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl text-navy">New capture form</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label>Internal name</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="14 Riverside Ave — Open House" autoFocus />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={kind} onChange={(e) => setKind(e.target.value as any)}>
                  <option value="open_house">Open house sign-in</option>
                  <option value="general">General landing page</option>
                  <option value="listing">Listing inquiry</option>
                </Select>
              </div>
              <div>
                <Label>Headline (shown to visitors)</Label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Welcome to 14 Riverside Ave" />
              </div>
              <div>
                <Label>Subhead (optional)</Label>
                <Textarea rows={2} value={subhead} onChange={(e) => setSubhead(e.target.value)} placeholder="Sign in and we'll send details + any price updates." />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="gold" onClick={createForm} disabled={busy || title.trim().length < 1}>
                {busy ? "Creating…" : "Create form"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
