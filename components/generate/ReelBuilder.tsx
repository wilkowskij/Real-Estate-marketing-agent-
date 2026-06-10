"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { storyboardToText, type Storyboard } from "@/lib/video/storyboard";

interface RenderResponse {
  storyboard: Storyboard;
  videoUrl: string | null;
  rendered: boolean;
  message?: string;
}

/**
 * Turns a generated reel script into a storyboard (and an MP4 when a video
 * provider is configured). With no provider it still delivers the shot list to
 * film or download — the same manual-first pattern as social publishing.
 */
export function ReelBuilder({
  reelScript,
  photoUrls,
  headline,
  caption,
  cta,
}: {
  reelScript: string[];
  photoUrls: string[];
  headline: string;
  caption: string;
  cta: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RenderResponse | null>(null);

  async function assemble() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelScript, photoUrls, headline, caption, cta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not assemble the reel");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadShotList() {
    if (!data) return;
    const blob = new Blob([storyboardToText(data.storyboard)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reel-shot-list.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) {
    return (
      <div className="mt-2">
        <Button variant="secondary" onClick={assemble} disabled={busy}>
          {busy ? "Assembling…" : "🎬 Assemble reel"}
        </Button>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    );
  }

  const sb = data.storyboard;
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Storyboard · ~{sb.totalSec}s · {sb.aspect} · {sb.scenes.length} scenes
        </p>
        <button type="button" onClick={downloadShotList} className="text-xs font-semibold text-gold-deep hover:underline">
          Download shot list
        </button>
      </div>

      {data.videoUrl ? (
        <video controls src={data.videoUrl} className="w-full max-w-xs rounded-lg border border-paper-line" />
      ) : (
        data.message && <p className="text-xs text-ink-muted">{data.message}</p>
      )}

      <ol className="space-y-2">
        {sb.scenes.map((s) => (
          <li key={s.index} className="flex gap-3 rounded-lg border border-paper-line p-2">
            {s.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-paper text-xs text-ink-muted">
                {s.index + 1}
              </div>
            )}
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">
                {s.onScreenText || `Scene ${s.index + 1}`}{" "}
                <span className="text-xs font-normal text-ink-muted">· {s.durationSec}s</span>
              </p>
              {s.direction && <p className="text-xs text-ink-muted">{s.direction}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
