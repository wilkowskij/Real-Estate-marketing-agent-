"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Lightweight, dependency-free photo editor. Loads a photo onto a canvas and
 * applies rotate / flip / brightness / contrast / saturation / aspect-crop, then
 * exports a PNG Blob. The parent re-uploads it as a new asset so the original is
 * never destroyed. Used before generating a campaign graphic.
 */
export interface EditResult {
  blob: Blob;
}

type Aspect = { key: string; label: string; ratio: number | null };
const ASPECTS: Aspect[] = [
  { key: "free", label: "Original", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:5", label: "4:5", ratio: 4 / 5 },
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
  { key: "1.91:1", label: "1.91:1", ratio: 1.91 },
];

export function PhotoEditor({
  src,
  onCancel,
  onSave,
  busy,
}: {
  src: string;
  onCancel: () => void;
  onSave: (r: EditResult) => void;
  busy?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [rotation, setRotation] = useState(0); // 0/90/180/270
  const [flipH, setFlipH] = useState(false);
  const [brightness, setBrightness] = useState(100); // %
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [aspect, setAspect] = useState<Aspect>(ASPECTS[0]);

  // Load the image once (crossOrigin so the canvas stays exportable for signed URLs).
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  // Esc closes the modal; restore focus to whatever was focused before opening.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [onCancel]);

  // Redraw whenever an edit param changes.
  useEffect(() => {
    if (!loaded) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, rotation, flipH, brightness, contrast, saturation, aspect]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    // Dimensions after rotation.
    const rotated = rotation % 180 !== 0;
    const iw = rotated ? img.height : img.width;
    const ih = rotated ? img.width : img.height;

    // Apply the chosen aspect as a centered crop of the rotated image.
    let cw = iw;
    let ch = ih;
    if (aspect.ratio) {
      if (iw / ih > aspect.ratio) cw = Math.round(ih * aspect.ratio);
      else ch = Math.round(iw / aspect.ratio);
    }

    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    // Translate to center of the crop, then apply rotation/flip, then draw the
    // image centered so the crop takes the middle of the (rotated) frame.
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExportError(null);
    try {
      // toBlob throws SecurityError if the canvas was tainted (cross-origin
      // image without CORS). Surface it instead of leaving the parent stuck
      // in a "Saving…" state forever.
      canvas.toBlob((blob) => {
        if (blob) onSave({ blob });
        else setExportError("Could not export the edited image. Try a different photo.");
      }, "image/png");
    } catch {
      setExportError("This image can't be edited here (cross-origin restriction).");
    }
  }

  const slider = (
    label: string,
    value: number,
    set: (n: number) => void
  ) => (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </span>
      <input
        type="range"
        min={50}
        max={150}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit photo"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl2 bg-paper-card shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h3 className="font-display text-xl text-navy">Edit photo</h3>
          <button onClick={onCancel} className="text-ink-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-auto p-6 md:flex-row">
          {/* Canvas preview */}
          <div className="flex flex-1 items-center justify-center rounded-lg bg-paper p-3">
            <canvas
              ref={canvasRef}
              className="max-h-[55vh] max-w-full rounded-md object-contain shadow-card"
            />
          </div>

          {/* Controls */}
          <div className="w-full shrink-0 space-y-5 md:w-64">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Transform</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setRotation((r) => (r + 270) % 360)}>
                  ⟲ Left
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  ⟳ Right
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setFlipH((f) => !f)}>
                  ⇄ Flip
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Crop</p>
              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setAspect(a)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      aspect.key === a.key
                        ? "border-gold bg-gold/10 text-gold-deep"
                        : "border-paper-line text-ink-soft hover:border-gold/50"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Adjust</p>
              {slider("Brightness", brightness, setBrightness)}
              {slider("Contrast", contrast, setContrast)}
              {slider("Saturation", saturation, setSaturation)}
              <button
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  setRotation(0);
                  setFlipH(false);
                  setAspect(ASPECTS[0]);
                }}
                className="text-xs text-gold-deep hover:underline"
              >
                Reset all
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-paper-line px-6 py-4">
          {exportError && <p className="mr-auto text-sm text-error">{exportError}</p>}
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="gold" onClick={save} disabled={busy || !loaded}>
            {busy ? "Saving…" : "Save edited photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
