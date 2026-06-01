"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface QueuePost {
  id: string;
  platform: string;
  caption: string | null;
  state: string;
  scheduled_at: string | null;
}

/** One row in the approval queue: approve a draft, or publish now. */
export function QueueItem({ post }: { post: QueuePost }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[] | null>(null);

  async function call(action: "approve" | "publish", overrideCompliance = false) {
    setBusy(true);
    setError(null);
    try {
      if (action === "approve") {
        const res = await fetch(`/api/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "approved" }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      } else {
        const res = await fetch(`/api/posts/${post.id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrideCompliance }),
        });
        const json = await res.json();
        if (!res.ok) {
          // Fair-Housing gate: offer an explicit override instead of a dead end.
          if (Array.isArray(json.complianceNotes) && json.complianceNotes.length) {
            setBlocked(json.complianceNotes);
          }
          throw new Error(json.error ?? "Publish failed");
        }
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize text-ink">{post.platform}</span>
            <Badge>{post.state}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{post.caption}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {post.state === "draft" && (
            <Button variant="secondary" size="sm" onClick={() => call("approve")} disabled={busy}>
              Approve
            </Button>
          )}
          <Button variant="gold" size="sm" onClick={() => call("publish")} disabled={busy}>
            {busy ? "…" : "Publish"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {blocked && blocked.length > 0 && (
        <div className="mt-2 rounded-lg bg-warning-soft p-3 text-xs text-warning">
          <p className="font-semibold">Fair-Housing review — resolve before publishing:</p>
          <ul className="mt-1 list-disc pl-4">
            {blocked.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <button
            onClick={() => call("publish", true)}
            disabled={busy}
            className="mt-2 font-semibold text-warning underline disabled:opacity-50"
          >
            I&apos;ve reviewed — publish anyway
          </button>
        </div>
      )}
    </div>
  );
}
