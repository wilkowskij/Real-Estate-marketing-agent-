"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { useModalDismiss } from "@/lib/useModalDismiss";

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

type PacketMode = "mls" | "manual" | "pdf";

interface ListingOption {
  id: string;
  address: string;
  town: string | null;
  state: string;
  price: number | null;
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

// ---------------------------------------------------------------------------
// Packet mode picker card
// ---------------------------------------------------------------------------
function PacketModeCard({
  mode,
  selected,
  icon,
  title,
  description,
  onSelect,
}: {
  mode: PacketMode;
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  onSelect: (m: PacketMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
        selected
          ? "border-gold bg-gold/5"
          : "border-paper-line bg-white hover:border-gold/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-navy">{title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
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

  // ── dialog open / step ─────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const createDialogRef = useModalDismiss<HTMLDivElement>(creating, () => {
    setCreating(false);
    resetDialog();
  });

  // ── step 1 fields ──────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"general" | "open_house" | "listing">("open_house");
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");

  // ── step 2 — packet setup ──────────────────────────────────────────────
  const [packetMode, setPacketMode] = useState<PacketMode>("mls");

  // MLS mode
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState("");

  // Manual mode
  const [manualAddress, setManualAddress] = useState("");
  const [manualTown, setManualTown] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualBeds, setManualBeds] = useState("");
  const [manualBaths, setManualBaths] = useState("");
  const [manualSqft, setManualSqft] = useState("");
  const [manualDesc, setManualDesc] = useState("");

  // PDF mode
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // ── shared ─────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function resetDialog() {
    setStep(1);
    setTitle("");
    setKind("open_house");
    setHeadline("");
    setSubhead("");
    setPacketMode("mls");
    setSelectedListingId("");
    setListings([]);
    setListingsLoaded(false);
    setManualAddress("");
    setManualTown("");
    setManualPrice("");
    setManualBeds("");
    setManualBaths("");
    setManualSqft("");
    setManualDesc("");
    setPdfFile(null);
    setError(null);
  }

  async function goToStep2() {
    if (title.trim().length < 1) return;
    setError(null);
    setStep(2);
    if (!listingsLoaded) {
      const res = await fetch("/api/listings");
      if (res.ok) {
        const json = await res.json();
        setListings(json.listings ?? []);
      }
      setListingsLoaded(true);
    }
  }

  async function createForm() {
    setBusy(true);
    setError(null);
    try {
      let packetPdfPath: string | undefined;

      if (packetMode === "pdf") {
        if (!pdfFile) throw new Error("Please select a PDF file.");
        setUploadingPdf(true);
        const fd = new FormData();
        fd.append("file", pdfFile);
        const upRes = await fetch("/api/lead-forms/packet-upload", { method: "POST", body: fd });
        const upJson = await upRes.json();
        setUploadingPdf(false);
        if (!upRes.ok) throw new Error(upJson.error ?? "PDF upload failed.");
        packetPdfPath = upJson.path;
      }

      const packetDetails =
        packetMode === "manual"
          ? {
              address: manualAddress || undefined,
              town: manualTown || undefined,
              price: manualPrice ? Number(manualPrice) : undefined,
              beds: manualBeds ? Number(manualBeds) : undefined,
              baths: manualBaths ? Number(manualBaths) : undefined,
              sqft: manualSqft ? Number(manualSqft) : undefined,
              description: manualDesc || undefined,
            }
          : undefined;

      const res = await fetch("/api/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          kind,
          headline: headline || undefined,
          subhead: subhead || undefined,
          listingId: packetMode === "mls" && selectedListingId ? selectedListingId : undefined,
          packetMode: kind === "open_house" ? packetMode : "mls",
          packetPdfPath,
          packetDetails,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not create");

      setCreating(false);
      resetDialog();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setUploadingPdf(false);
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
    const dealTitle = lead.name || lead.email || lead.phone || "New deal";
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: dealTitle, leadId: lead.id }),
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

  const isStep1Valid = title.trim().length >= 1;
  const isStep2Valid =
    packetMode === "pdf" ? !!pdfFile :
    packetMode === "manual" ? manualAddress.trim().length >= 1 :
    true; // mls: listing optional

  return (
    <>
      {/* Capture forms */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg text-navy">Capture forms</h2>
        <Button variant="gold" size="sm" onClick={() => { resetDialog(); setCreating(true); }}>
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

      {/* ── Create-form dialog ─────────────────────────────────────────── */}
      {creating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={() => { setCreating(false); resetDialog(); }} />
          <div
            ref={createDialogRef}
            role="dialog"
            aria-modal="true"
            className="relative z-50 w-full max-w-lg rounded-xl2 border border-paper-line bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Step indicator */}
            {kind === "open_house" && (
              <div className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
                <span className={step === 1 ? "font-semibold text-navy" : ""}>1 Form details</span>
                <span>→</span>
                <span className={step === 2 ? "font-semibold text-navy" : ""}>2 Packet setup</span>
              </div>
            )}

            {/* ── Step 1 ─────────────────────────────────────────── */}
            {step === 1 && (
              <>
                <h2 className="font-display text-xl text-navy">New capture form</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Internal name</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="14 Riverside Ave — Open House"
                      autoFocus
                    />
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
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Welcome to 14 Riverside Ave"
                    />
                  </div>
                  <div>
                    <Label>Subhead (optional)</Label>
                    <Textarea
                      rows={2}
                      value={subhead}
                      onChange={(e) => setSubhead(e.target.value)}
                      placeholder="Sign in and we'll send the property packet right to your inbox."
                    />
                  </div>
                  {error && <p className="text-sm text-error">{error}</p>}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => { setCreating(false); resetDialog(); }} disabled={busy}>
                    Cancel
                  </Button>
                  {kind === "open_house" ? (
                    <Button variant="gold" onClick={goToStep2} disabled={!isStep1Valid}>
                      Next →
                    </Button>
                  ) : (
                    <Button variant="gold" onClick={createForm} disabled={busy || !isStep1Valid}>
                      {busy ? "Creating…" : "Create form"}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* ── Step 2 — Packet setup ───────────────────────────── */}
            {step === 2 && (
              <>
                <h2 className="font-display text-xl text-navy">Packet setup</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  How should we build the property packet that gets emailed to every sign-in?
                </p>

                <div className="mt-4 space-y-3">
                  <PacketModeCard
                    mode="mls"
                    selected={packetMode === "mls"}
                    icon="🏡"
                    title="Generate from MLS data"
                    description="Pull details from a listing already saved in Marquee. Best when the property is in your listings."
                    onSelect={setPacketMode}
                  />
                  <PacketModeCard
                    mode="manual"
                    selected={packetMode === "manual"}
                    icon="✏️"
                    title="Enter details manually"
                    description="Type in the address, price, beds/baths, and a description. No listing required."
                    onSelect={setPacketMode}
                  />
                  <PacketModeCard
                    mode="pdf"
                    selected={packetMode === "pdf"}
                    icon="📄"
                    title="Upload a PDF packet"
                    description="Attach your own branded PDF brochure. It will be attached to every confirmation email."
                    onSelect={setPacketMode}
                  />
                </div>

                {/* ── MLS mode: listing picker ── */}
                {packetMode === "mls" && (
                  <div className="mt-4">
                    <Label>Select a listing (optional)</Label>
                    {!listingsLoaded ? (
                      <p className="text-xs text-ink-muted">Loading…</p>
                    ) : listings.length === 0 ? (
                      <p className="text-xs text-ink-muted">
                        No listings saved yet — the packet will still send with your contact info.
                      </p>
                    ) : (
                      <Select
                        value={selectedListingId}
                        onChange={(e) => setSelectedListingId(e.target.value)}
                      >
                        <option value="">— none (contact info only) —</option>
                        {listings.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.address}{l.town ? `, ${l.town}` : ""}
                            {l.price ? ` · $${l.price.toLocaleString()}` : ""}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                )}

                {/* ── Manual mode: property details ── */}
                {packetMode === "manual" && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Property address *</Label>
                        <Input
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          placeholder="14 Riverside Ave"
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label>Town / City</Label>
                        <Input value={manualTown} onChange={(e) => setManualTown(e.target.value)} placeholder="Red Bank" />
                      </div>
                      <div>
                        <Label>List price ($)</Label>
                        <Input
                          type="number"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder="850000"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label>Beds</Label>
                        <Input type="number" value={manualBeds} onChange={(e) => setManualBeds(e.target.value)} placeholder="4" min="0" />
                      </div>
                      <div>
                        <Label>Baths</Label>
                        <Input type="number" value={manualBaths} onChange={(e) => setManualBaths(e.target.value)} placeholder="2.5" min="0" step="0.5" />
                      </div>
                      <div>
                        <Label>Sqft</Label>
                        <Input type="number" value={manualSqft} onChange={(e) => setManualSqft(e.target.value)} placeholder="2400" min="0" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="Stunning Colonial on a quiet cul-de-sac…"
                      />
                    </div>
                  </div>
                )}

                {/* ── PDF mode: file upload ── */}
                {packetMode === "pdf" && (
                  <div className="mt-4">
                    <Label>PDF packet file *</Label>
                    <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-paper-line bg-paper px-4 py-5 hover:border-gold/50 transition-colors">
                      <span className="text-2xl">📤</span>
                      <div className="min-w-0 flex-1">
                        {pdfFile ? (
                          <>
                            <p className="truncate text-sm font-medium text-navy">{pdfFile.name}</p>
                            <p className="text-xs text-ink-muted">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB — click to replace</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-navy">Choose a PDF</p>
                            <p className="text-xs text-ink-muted">Max 20 MB</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setPdfFile(f);
                        }}
                      />
                    </label>
                  </div>
                )}

                {error && <p className="mt-3 text-sm text-error">{error}</p>}

                <div className="mt-5 flex justify-between gap-2">
                  <Button variant="secondary" onClick={() => { setStep(1); setError(null); }} disabled={busy}>
                    ← Back
                  </Button>
                  <Button
                    variant="gold"
                    onClick={createForm}
                    disabled={busy || !isStep2Valid}
                  >
                    {uploadingPdf ? "Uploading PDF…" : busy ? "Creating…" : "Create form"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
