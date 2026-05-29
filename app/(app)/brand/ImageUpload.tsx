"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/Field";

/**
 * Upload a single branding image (logo light/dark, or headshot) to
 * POST /api/brand/asset. Shows the current image and swaps in the new one on
 * success. `dark` renders the preview on a dark ground (for the dark-logo slot).
 */
export function ImageUpload({
  slot,
  label,
  currentUrl,
  disabled,
  dark,
}: {
  slot: "logo_light" | "logo_dark" | "headshot";
  label: string;
  currentUrl: string | null;
  disabled?: boolean;
  dark?: boolean;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", slot);
      const res = await fetch("/api/brand/asset", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setPreview(json.previewUrl);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <label
        className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed py-6 text-sm transition-colors ${
          dark ? "bg-navy text-paper/70" : "border-paper-line text-ink-muted"
        } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-gold/60"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className={slot === "headshot" ? "h-20 w-20 rounded-full object-cover" : "max-h-20 object-contain"}
          />
        ) : (
          <span>{busy ? "Uploading…" : `Upload ${label.toLowerCase()}`}</span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => onPick(e.target.files)}
        />
      </label>
      {preview && !disabled && (
        <p className="mt-1 text-center text-xs text-ink-muted">{busy ? "Uploading…" : "Click to replace"}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
