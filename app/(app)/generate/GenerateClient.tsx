"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { PLATFORM_SIZES } from "@/lib/design/platforms";

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
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [library, setLibrary] = useState<UploadedPhoto[] | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

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

  async function onGenerate() {
    if (photos.length === 0) {
      setError("Add at least one photo first.");
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
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_460px]">
      {/* Form */}
      <Card>
        <CardBody className="space-y-6">
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
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-paper-line py-8 text-center hover:border-gold/60">
              <span className="text-sm text-ink-soft">
                {uploading ? "Uploading…" : "Click to upload listing photos"}
              </span>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.assetId}
                    src={p.previewUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
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

          {error && <p className="text-sm text-red-600">{error}</p>}

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
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
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
  );
}
