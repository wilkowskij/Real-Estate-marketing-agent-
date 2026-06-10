"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

// Tailwind aspect-ratio class per output size
const SIZE_ASPECT: Record<string, string> = {
  ig_square:   "aspect-square",
  ig_portrait: "aspect-[4/5]",
  ig_story:    "aspect-[9/16]",
  fb_feed:     "aspect-[1200/630]",
  linkedin:    "aspect-[1200/627]",
};

// Quick-format presets shown above the size select
const QUICK_FORMATS = [
  { key: "ig_portrait", label: "Portrait" },
  { key: "ig_square",   label: "Square"   },
  { key: "ig_story",    label: "Story 9:16" },
  { key: "fb_feed",     label: "FB / LinkedIn" },
] as const;

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
  slopIssues?: string[];
}

interface MessageResult {
  channel: "email" | "sms";
  copy: {
    // email
    subject?: string;
    preview?: string;
    body?: string;
    cta?: string;
    // sms
    message?: string;
    compliance_notes: string[];
  };
  slopIssues?: string[];
}

/** Resize a photo to at most 2048 px on its longest side, output as JPEG.
 *  Keeps any photo well under Vercel's 4.5 MB body limit while remaining
 *  sharp enough for every social platform. */
function resizeForUpload(file: File, maxPx = 2048, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Could not process image")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read image")); };
    img.src = objectUrl;
  });
}

export function GenerateClient() {
  const params = useSearchParams();
  const initialType = (params.get("type") as CampaignType) || "just_sold";

  const [channel, setChannel] = useState<"social" | "email" | "sms">("social");
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
  const [recipientName, setRecipientName] = useState("");
  const [messageResult, setMessageResult] = useState<MessageResult | null>(null);
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
  // Open House QR code
  const [openHouseUrl, setOpenHouseUrl] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  async function downloadQr() {
    if (!openHouseUrl.trim()) return;
    setQrBusy(true);
    setQrError(null);
    try {
      // Use our server-side proxy to avoid CORS restrictions on the QR API
      const proxyUrl = `/api/qr?size=400&url=${encodeURIComponent(openHouseUrl.trim())}`;
      const res  = await fetch(proxyUrl);
      if (!res.ok) throw new Error("QR download failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = href;
      a.download = "open-house-qr.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 100);
    } catch (e: any) {
      setQrError(e.message ?? "Download failed");
    } finally {
      setQrBusy(false);
    }
  }

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
        const resized = await resizeForUpload(file);
        const fd = new FormData();
        fd.append("file", resized);
        const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
        let json: any;
        try {
          json = await res.json();
        } catch {
          throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
        }
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
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error(
          res.status === 504
            ? "The request timed out. Try again, or use fewer photos."
            : `Generation failed (${res.status}). Please try again.`
        );
      }
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Generation failed");
      setResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  /** Generate email or SMS nurture copy (the Messaging Agent). */
  async function onGenerateMessage() {
    setGenerating(true);
    setError(null);
    setMessageResult(null);
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const res = await fetch("/api/campaigns/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          type,
          instructions: instructions || undefined,
          recipientName: recipientName || undefined,
          listing: {
            address: listing.address || undefined,
            town: listing.town || undefined,
            price: num(listing.price),
            beds: num(listing.beds),
            baths: num(listing.baths),
            sqft: num(listing.sqft),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Generation failed");
      setMessageResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  const CHANNELS = [
    { key: "social", label: "Social post", icon: "📱" },
    { key: "email", label: "Email", icon: "✉️" },
    { key: "sms", label: "SMS", icon: "💬" },
  ] as const;

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
          {/* Channel switcher — social post, email, or SMS. */}
          <div className="flex gap-2 rounded-xl2 bg-paper p-1">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setChannel(c.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  channel === c.key
                    ? "bg-white text-navy shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          {/* AI-first intake: describe it in one line; we fill in the rest. */}
          <div>
            <div className="flex items-center justify-between">
              <Label>
                {channel === "social"
                  ? "Describe your post"
                  : channel === "email"
                  ? "Describe your email"
                  : "Describe your text"}
              </Label>
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
              <Label>Output format</Label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSizeKey(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      sizeKey === f.key
                        ? "border-gold bg-gold/10 font-semibold text-gold-deep"
                        : "border-paper-line text-ink-soft hover:border-gold/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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

          {channel !== "social" && (
            <div>
              <Label>Recipient first name (optional)</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Sarah — personalizes the greeting"
              />
            </div>
          )}

          {channel === "social" && (
          <>
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
          </>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <Button
            variant="gold"
            size="lg"
            onClick={channel === "social" ? onGenerate : onGenerateMessage}
            disabled={generating}
            className="w-full"
          >
            {generating
              ? "Your agents are working…"
              : channel === "social"
              ? "Generate campaign"
              : channel === "email"
              ? "Generate email"
              : "Generate text"}
          </Button>
        </CardBody>
      </Card>

      {/* Preview */}
      <div className="space-y-4">
        {channel === "social" && (
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
              <div
                className={`flex items-center justify-center rounded-lg bg-paper text-sm text-ink-muted ${SIZE_ASPECT[sizeKey] ?? "aspect-[4/5]"}`}
              >
                {sizeKey === "ig_story" ? "9:16 Story format" : "Your finished graphic appears here."}
              </div>
            )}
          </CardBody>
        </Card>
        )}

        {/* Email / SMS preview */}
        {channel !== "social" && (
          <MessagePreview
            channel={channel}
            result={messageResult}
            campaignType={type}
          />
        )}

        {/* Open House QR code — shown whenever open_house is selected */}
        {channel === "social" && type === "open_house" && (
          <Card>
            <CardBody className="space-y-3">
              <p className="eyebrow">Open House QR Code</p>
              <p className="text-xs text-ink-muted">
                Paste any URL — your website, Calendly link, or listing page — and print
                the QR code for flyers, signs, and handouts at the open house.
              </p>
              <div>
                <label htmlFor="open-house-url" className="eyebrow mb-1 block text-xs">
                  URL to encode
                </label>
                <input
                  id="open-house-url"
                  type="url"
                  value={openHouseUrl}
                  onChange={(e) => setOpenHouseUrl(e.target.value)}
                  placeholder="https://your-site.com/open-house"
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>
              {openHouseUrl.trim() && (
                <div className="flex flex-col items-center gap-3">
                  {/* Served via /api/qr proxy to avoid CORS */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qr?size=200&url=${encodeURIComponent(openHouseUrl.trim())}`}
                    alt="QR code"
                    width={200}
                    height={200}
                    className="rounded-lg border border-paper-line"
                  />
                  {qrError && <p className="text-xs text-error">{qrError}</p>}
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={qrBusy}
                    className="rounded-lg border border-paper-line px-4 py-2 text-sm font-medium text-ink hover:border-gold disabled:opacity-50"
                  >
                    {qrBusy ? "Downloading…" : "⬇ Download QR PNG"}
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {channel === "social" && result && (
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
              {result.slopIssues && result.slopIssues.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-semibold">⚠ Stop Slop — generic content detected</p>
                  <p className="mt-0.5 text-amber-700">
                    Regenerate or edit the copy to fix these before posting:
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {result.slopIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
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

/** Right-column preview for email / SMS copy, with copy + save-to-campaign. */
function MessagePreview({
  channel,
  result,
  campaignType,
}: {
  channel: "email" | "sms";
  result: MessageResult | null;
  campaignType: CampaignType;
}) {
  const [copied, setCopied] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load the org's campaigns once so the result can be filed into one.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/campaigns")
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((j) => {
        if (!cancelled) setCampaigns((j.campaigns ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A fresh result clears the saved flag so the user can save the new copy.
  useEffect(() => {
    setSaved(false);
  }, [result]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function saveToCampaign() {
    if (!selectedCampaign || !result) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaign}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, type: campaignType, content: result.copy }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!result) {
    return (
      <Card>
        <CardBody>
          <p className="eyebrow mb-3">Preview</p>
          <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-paper p-6 text-center text-sm text-ink-muted">
            {channel === "email"
              ? "Your email subject line and body will appear here."
              : "Your text message will appear here."}
          </div>
        </CardBody>
      </Card>
    );
  }

  const c = result.copy;
  const fullText =
    channel === "email"
      ? `Subject: ${c.subject}\n\n${c.body}\n\n${c.cta}`
      : c.message ?? "";

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{channel === "email" ? "Email preview" : "SMS preview"}</p>
          <button
            type="button"
            onClick={() => copy(fullText)}
            className="text-xs font-semibold text-gold-deep hover:underline"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {channel === "email" ? (
          <div className="rounded-lg border border-paper-line bg-white">
            {/* Inbox-style header */}
            <div className="border-b border-paper-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">{c.subject}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{c.preview}</p>
            </div>
            <div className="px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-ink-soft">{c.body}</p>
              {c.cta && <p className="mt-3 text-sm font-medium text-navy">{c.cta}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* iMessage-style bubble */}
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-paper px-4 py-2.5 text-sm text-ink">
              {c.message}
            </div>
            <p className="text-[11px] text-ink-muted">
              {(c.message ?? "").length} characters ·{" "}
              {Math.ceil((c.message ?? "").length / 160) || 1} SMS segment
              {Math.ceil((c.message ?? "").length / 160) > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {result.slopIssues && result.slopIssues.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">⚠ Stop Slop — generic content detected</p>
            <ul className="mt-1 list-disc pl-4">
              {result.slopIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {c.compliance_notes.length > 0 && (
          <div className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
            <p className="font-semibold">Compliance notes</p>
            <ul className="mt-1 list-disc pl-4">
              {c.compliance_notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Save into a campaign object */}
        {campaigns.length > 0 && (
          <div className="border-t border-paper-line pt-3">
            <Label>Save to campaign</Label>
            <div className="flex gap-2">
              <Select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="flex-1"
              >
                <option value="">Choose a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                onClick={saveToCampaign}
                disabled={!selectedCampaign || saving || saved}
              >
                {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
