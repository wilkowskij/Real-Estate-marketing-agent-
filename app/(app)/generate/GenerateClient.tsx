"use client";

import { useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { PLATFORM_SIZES } from "@/lib/design/platforms";
import { PhotoEditor, type EditResult } from "./PhotoEditor";

type CampaignType =
  | "just_sold"
  | "new_listing"
  | "open_house"
  | "market_stat"
  | "neighborhood_spotlight"
  | "deal_of_week"
  | "before_after"
  | "educational"
  | "testimonial"
  | "custom";

const TYPES: { value: CampaignType; label: string }[] = [
  { value: "just_sold", label: "Just Sold" },
  { value: "new_listing", label: "New Listing" },
  { value: "open_house", label: "Open House" },
  { value: "market_stat", label: "Market Stat" },
  { value: "neighborhood_spotlight", label: "Neighborhood" },
  { value: "deal_of_week", label: "Deal of the Week" },
  { value: "before_after", label: "Before / After" },
  { value: "educational", label: "Educational" },
  { value: "testimonial", label: "Testimonial" },
  { value: "custom", label: "Custom" },
];

const FORMAT_LABEL: Record<string, string> = {
  reel: "🎬 Reel",
  carousel: "🎠 Carousel",
  infographic: "📊 Infographic",
  single_image: "🖼 Single image",
};

interface UploadedPhoto {
  assetId: string;
  previewUrl: string;
}

interface Result {
  previewUrl: string | null;
  copy: {
    headline: string;
    caption: string;
    cta: string;
    hashtags: string[];
    compliance_notes: string[];
    format?: "reel" | "carousel" | "infographic" | "single_image";
    reel_script?: string[];
    carousel_slides?: string[];
  };
  enhanced?: boolean;
  generatedImage?: boolean;
}

export function GenerateClient() {
  const params = useSearchParams();
  const initialType = (params.get("type") as CampaignType) || "just_sold";

  const [type, setType] = useState<CampaignType>(initialType);
  const [listing, setListing] = useState({
    address: "",
    town: "",
    price: "",
    beds: "",
    baths: "",
    sqft: "",
  });
  const [instructions, setInstructions] = useState("");
  const [sizeKey, setSizeKey] = useState("ig_portrait");
  const [enhance, setEnhance] = useState(false);
  const [aiImage, setAiImage] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [editing, setEditing] = useState<UploadedPhoto | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [library, setLibrary] = useState<UploadedPhoto[] | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  // AI-first intake: a single prompt box parses into the detailed fields, which
  // start collapsed so the page is simple by default.
  const [brief, setBrief] = useState("");
  const [parsing, setParsing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setBrief((prev) => (prev ? prev.trimEnd() + " " + transcript : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  async function onParseBrief() {
    if (brief.trim().length < 3) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: brief }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not read that.");
      const b = json.brief as {
        type: CampaignType | null;
        listing: Record<string, number | string | null | undefined>;
        instructions: string | null;
      };
      if (b.type) setType(b.type);
      setListing((prev) => ({
        address: (b.listing.address as string) ?? prev.address,
        town: (b.listing.town as string) ?? prev.town,
        price: b.listing.price != null ? String(b.listing.price) : prev.price,
        beds: b.listing.beds != null ? String(b.listing.beds) : prev.beds,
        baths: b.listing.baths != null ? String(b.listing.baths) : prev.baths,
        sqft: b.listing.sqft != null ? String(b.listing.sqft) : prev.sqft,
      }));
      if (b.instructions) setInstructions(b.instructions);
      setShowDetails(true); // reveal so the agent can review the parsed fields
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  }

  async function toggleLibrary() {
    const next = !showLibrary;
    setShowLibrary(next);
    if (next && library === null) {
      try {
        const res = await fetch("/api/brand/library");
        const json = await res.json();
        setLibrary(
          (json.items ?? []).map((i: { id: string; previewUrl: string }) => ({
            assetId: i.id,
            previewUrl: i.previewUrl,
          }))
        );
      } catch {
        setLibrary([]);
      }
    }
  }

  function addFromLibrary(item: UploadedPhoto) {
    setPhotos((p) => (p.some((x) => x.assetId === item.assetId) ? p : [...p, item]));
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setPhotos((p) => [...p, { assetId: json.assetId, previewUrl: json.previewUrl }]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // Upload the edited photo as a NEW asset and replace the edited one in the
  // list (the original asset is preserved in storage).
  async function onSaveEdit(result: EditResult) {
    if (!editing) return;
    setSavingEdit(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", new File([result.blob], "edited.png", { type: "image/png" }));
      const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the edited photo");
      const edited = { assetId: json.assetId, previewUrl: json.previewUrl };
      setPhotos((p) => p.map((x) => (x.assetId === editing.assetId ? edited : x)));
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function onGenerate() {
    if (photos.length === 0 && !aiImage) {
      setError("Add at least one photo, or turn on “Generate image with AI.”");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          sizeKey,
          enhance,
          generateImage: aiImage,
          instructions: instructions || undefined,
          listing: {
            address: listing.address || undefined,
            town: listing.town || undefined,
            price: num(listing.price),
            beds: num(listing.beds),
            baths: num(listing.baths),
            sqft: num(listing.sqft),
          },
          photoAssetIds: photos.map((p) => p.assetId),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Generation failed");
      setResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {editing && (
        <PhotoEditor
          src={editing.previewUrl}
          busy={savingEdit}
          onCancel={() => setEditing(null)}
          onSave={onSaveEdit}
        />
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_460px]">
      {/* Form */}
      <Card>
        <CardBody className="space-y-6">
          {/* AI-first intake: describe it in one line; we fill in the rest. */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Describe your post</Label>
              <button
                type="button"
                onClick={toggleListening}
                aria-label={listening ? "Stop recording" : "Dictate with microphone"}
                className={`mb-1.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  listening
                    ? "animate-pulse bg-error/10 text-error"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M7 4a3 3 0 016 0v5a3 3 0 01-6 0V4z" />
                  <path fillRule="evenodd" d="M5.5 9a.5.5 0 011 0 3.5 3.5 0 007 0 .5.5 0 011 0A4.5 4.5 0 0110.5 13.4V15h1a.5.5 0 010 1h-3a.5.5 0 010-1h1v-1.6A4.5 4.5 0 015.5 9z" clipRule="evenodd" />
                </svg>
                {listening ? "Recording…" : "Dictate"}
              </button>
            </div>
            <Textarea
              rows={2}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. Just sold 14 Riverside Ave in Red Bank for $1.25M, 4 bed 3 bath, walk to the train"
            />
            <div className="mt-2 flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={onParseBrief} disabled={parsing || brief.trim().length < 3}>
                {parsing ? "Reading…" : "✨ Set it up for me"}
              </Button>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs font-semibold text-gold-deep hover:underline"
              >
                {showDetails ? "Hide details" : "Enter details manually"}
              </button>
            </div>
          </div>

          {showDetails && (
            <>
          <div>
            <Label>Campaign type</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    type === t.value
                      ? "border-gold bg-gold/10 text-gold-deep"
                      : "border-paper-line text-ink-soft hover:border-gold/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={listing.address}
                onChange={(e) => setListing({ ...listing, address: e.target.value })}
                placeholder="14 Riverside Ave"
              />
            </div>
            <div>
              <Label>Town</Label>
              <Input
                value={listing.town}
                onChange={(e) => setListing({ ...listing, town: e.target.value })}
                placeholder="Red Bank"
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                value={listing.price}
                onChange={(e) => setListing({ ...listing, price: e.target.value })}
                placeholder="1250000"
              />
            </div>
            <div>
              <Label>Beds</Label>
              <Input
                type="number"
                value={listing.beds}
                onChange={(e) => setListing({ ...listing, beds: e.target.value })}
              />
            </div>
            <div>
              <Label>Baths</Label>
              <Input
                type="number"
                value={listing.baths}
                onChange={(e) => setListing({ ...listing, baths: e.target.value })}
              />
            </div>
            <div>
              <Label>Sq Ft</Label>
              <Input
                type="number"
                value={listing.sqft}
                onChange={(e) => setListing({ ...listing, sqft: e.target.value })}
              />
            </div>
            <div>
              <Label>Output size</Label>
              <Select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)}>
                {Object.values(PLATFORM_SIZES).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes for the marketing agent (optional)</Label>
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Walk to the train, renovated kitchen, deep lot…"
            />
          </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              <button
                type="button"
                onClick={toggleLibrary}
                className="mb-1.5 text-xs font-semibold text-gold-deep hover:underline"
              >
                {showLibrary ? "Hide brand library" : "Use brand library"}
              </button>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl2 border-2 border-dashed border-paper-line py-8 text-center hover:border-gold/60">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-ink-muted">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-ink-soft">
                {uploading ? "Uploading…" : "Click to upload photos"}
              </span>
              <span className="text-xs text-ink-muted">Select one or more images at once</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onUpload(e.target.files)}
              />
            </label>

            {showLibrary && (
              <div className="mt-3 rounded-lg border border-paper-line p-3">
                <p className="mb-2 text-xs text-ink-muted">
                  Reusable company imagery — tap to add to this post.
                </p>
                {library === null ? (
                  <p className="text-xs text-ink-muted">Loading…</p>
                ) : library.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    No library images yet. Add some under Library.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {library.map((item) => {
                      const selected = photos.some((p) => p.assetId === item.assetId);
                      return (
                        <button
                          key={item.assetId}
                          type="button"
                          onClick={() => addFromLibrary(item)}
                          className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                            selected ? "border-gold" : "border-transparent"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {photos.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-ink-muted">{photos.length} photo{photos.length !== 1 ? "s" : ""} selected</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p.assetId} className="group relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      {/* Edit overlay — centre of thumbnail on hover */}
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="absolute inset-0 flex items-end justify-center rounded-lg bg-navy/50 pb-2 text-xs font-medium text-paper opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Edit
                      </button>
                      {/* Remove button — always-visible × in top-right corner */}
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setPhotos((prev) => prev.filter((x) => x.assetId !== p.assetId))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enhance}
            onClick={() => setEnhance((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl2 border border-paper-line bg-white px-4 py-3 text-left hover:border-gold/60"
          >
            <span>
              <span className="block text-sm font-medium text-ink">✨ AI-enhance the hero photo</span>
              <span className="block text-xs text-ink-muted">
                Sky, lawn & exposure cleanup via AI before the graphic is rendered.
              </span>
            </span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enhance ? "bg-gold" : "bg-paper-line"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enhance ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={aiImage}
            onClick={() => setAiImage((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl2 border border-paper-line bg-white px-4 py-3 text-left hover:border-gold/60"
          >
            <span>
              <span className="block text-sm font-medium text-ink">🎨 Generate image with AI</span>
              <span className="block text-xs text-ink-muted">
                No photo? Create an on-brand graphic from scratch — great for market-stat,
                educational &amp; neighborhood posts.
              </span>
            </span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${
                aiImage ? "bg-gold" : "bg-paper-line"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  aiImage ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>

          {error && <p className="text-sm text-error">{error}</p>}

          <Button
            variant="gold"
            size="lg"
            onClick={onGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? "Your agents are working…" : "Generate campaign"}
          </Button>
        </CardBody>
      </Card>

      {/* Preview */}
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardBody>
            <p className="eyebrow mb-3">Preview</p>
            {result?.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.previewUrl}
                alt="Generated campaign"
                className="w-full rounded-lg"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-paper text-sm text-ink-muted">
                Your finished graphic appears here.
              </div>
            )}
          </CardBody>
        </Card>

        {result && (
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg text-navy">{result.copy.headline}</h3>
                <span className="flex gap-1.5">
                  {result.generatedImage && <Badge>🎨 AI image</Badge>}
                  {result.enhanced && <Badge>✨ AI-enhanced</Badge>}
                  {result.copy.format && (
                    <Badge>{FORMAT_LABEL[result.copy.format] ?? result.copy.format}</Badge>
                  )}
                </span>
              </div>

              {result.copy.reel_script && result.copy.reel_script.length > 0 && (
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Reel script / shot list
                  </p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm text-ink-soft">
                    {result.copy.reel_script.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.copy.carousel_slides && result.copy.carousel_slides.length > 0 && (
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Carousel slides ({result.copy.carousel_slides.length})
                  </p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm text-ink-soft">
                    {result.copy.carousel_slides.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Caption
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink-soft">
                {result.copy.caption}
              </p>
              <p className="text-sm font-medium text-navy">{result.copy.cta}</p>
              <div className="flex flex-wrap gap-1.5">
                {result.copy.hashtags.map((h) => (
                  <span key={h} className="text-xs text-gold-deep">
                    {h.startsWith("#") ? h : `#${h}`}
                  </span>
                ))}
              </div>
              {result.copy.compliance_notes.length > 0 && (
                <div className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
                  <p className="font-semibold">Compliance notes</p>
                  <ul className="mt-1 list-disc pl-4">
                    {result.copy.compliance_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.previewUrl && (
                <a href={result.previewUrl} download className="block">
                  <Button variant="secondary" className="w-full">
                    Download graphic
                  </Button>
                </a>
              )}
            </CardBody>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}
