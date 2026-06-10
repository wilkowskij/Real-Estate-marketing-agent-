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
  is_brokerage_push?: boolean;
}

interface QueueItemProps {
  post: QueuePost;
  /** When true, show the "Push to team" button (admin/owner only). */
  isAdmin?: boolean;
}

interface PostDetail extends QueuePost {
  mediaUrls: string[];
  marketing_campaign_id: string | null;
  created_at: string;
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📸",
  facebook: "👍",
  linkedin: "💼",
  twitter: "𝕏",
  x: "𝕏",
};

function formatDate(iso: string | null) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/** One row in the approval queue — click to open the full preview drawer. */
export function QueueItem({ post, isAdmin = false }: QueueItemProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[] | null>(null);
  // Editable fields inside the drawer
  const [caption, setCaption] = useState(post.caption ?? "");
  const [scheduledAt, setScheduledAt] = useState(post.scheduled_at ?? "");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState(false);
  const [pushed, setPushed] = useState(post.is_brokerage_push ?? false);

  async function pushToTeam() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/posts/push-to-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Push failed");
      setPushed(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDrawer() {
    setOpen(true);
    if (detail) return;
    setLoadingDetail(true);
    try {
      const [res, campRes] = await Promise.all([
        fetch(`/api/posts/${post.id}`),
        fetch("/api/campaigns"),
      ]);
      const json = await res.json();
      if (res.ok) {
        setDetail(json);
        setCaption(json.caption ?? "");
        setScheduledAt(json.scheduled_at ?? "");
        setCampaignId(json.marketing_campaign_id ?? "");
      }
      if (campRes.ok) {
        const cj = await campRes.json();
        setCampaigns((cj.campaigns ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function attachCampaign(next: string) {
    setCampaignId(next);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingCampaignId: next || null }),
    });
    if (!res.ok) {
      setCampaignId(campaignId); // revert on failure
      setError("Failed to attach campaign. Please try again.");
    } else {
      router.refresh();
    }
  }

  async function regenerateCaption() {
    setRegenerating(true);
    setError(null);
    setRegenSuccess(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/regenerate-caption`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Regeneration failed");
      setCaption(json.caption);
      setRegenSuccess(true);
      setTimeout(() => setRegenSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function saveCaption() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          scheduled_at: scheduledAt || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

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
          if (Array.isArray(json.complianceNotes) && json.complianceNotes.length) {
            setBlocked(json.complianceNotes);
          }
          throw new Error(json.error ?? "Publish failed");
        }
      }
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Queue row — clicking the text area opens the preview */}
      <div className="py-3">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={openDrawer}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {PLATFORM_ICON[post.platform] ?? "📄"}
              </span>
              <span className="text-sm font-medium capitalize text-ink">{post.platform}</span>
              <Badge>{post.state}</Badge>
              {pushed && (
                <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy/70">
                  From brokerage
                </span>
              )}
              {post.scheduled_at && (
                <span className="text-xs text-ink-muted">{formatDate(post.scheduled_at)}</span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted hover:text-ink">
              {post.caption ?? <em>No caption yet</em>}
            </p>
          </button>
          <div className="flex shrink-0 gap-2">
            {isAdmin && !pushed && (
              <Button variant="ghost" size="sm" onClick={pushToTeam} disabled={busy} title="Mark as brokerage content for the whole team">
                Push to team
              </Button>
            )}
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
        {error && !open && <p className="mt-1 text-xs text-error">{error}</p>}
        {blocked && !open && blocked.length > 0 && (
          <div className="mt-2 rounded-lg bg-warning-soft p-3 text-xs text-warning">
            <p className="font-semibold">Fair-Housing review — resolve before publishing:</p>
            <ul className="mt-1 list-disc pl-4">
              {blocked.map((n, i) => <li key={i}>{n}</li>)}
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

      {/* Preview drawer — z-20/z-30 so mobile nav (z-40/z-50) always renders on top */}
      {open && (
        <div className="fixed inset-0 z-20 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-navy/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="relative z-30 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{PLATFORM_ICON[post.platform] ?? "📄"}</span>
                <span className="font-display text-lg capitalize text-navy">{post.platform}</span>
                <Badge>{post.state}</Badge>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-paper hover:text-ink"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              {loadingDetail && (
                <p className="text-sm text-ink-muted">Loading…</p>
              )}

              {/* Images */}
              {detail && detail.mediaUrls.length > 0 && (
                <div>
                  <p className="eyebrow mb-2">Media</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.mediaUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-28 w-28 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Caption editor */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="eyebrow">Caption</label>
                  <button
                    type="button"
                    onClick={regenerateCaption}
                    disabled={regenerating}
                    className="text-xs text-gold hover:underline disabled:opacity-50"
                  >
                    {regenerating ? "Regenerating…" : "↻ Regenerate caption"}
                  </button>
                </div>
                {regenSuccess && (
                  <p className="mb-1 text-xs text-green-600">Caption regenerated — review and save.</p>
                )}
                <textarea
                  rows={8}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="eyebrow mb-1 block">Scheduled for</label>
                <input
                  type="datetime-local"
                  value={scheduledAt ? scheduledAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : "")
                  }
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              {/* Campaign */}
              {campaigns.length > 0 && (
                <div>
                  <label className="eyebrow mb-1 block">Campaign</label>
                  <select
                    value={campaignId}
                    onChange={(e) => attachCampaign(e.target.value)}
                    className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                  >
                    <option value="">Not in a campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="text-sm text-error">{error}</p>}

              {blocked && blocked.length > 0 && (
                <div className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
                  <p className="font-semibold">Fair-Housing review — resolve before publishing:</p>
                  <ul className="mt-1 list-disc pl-4">
                    {blocked.map((n, i) => <li key={i}>{n}</li>)}
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

            {/* Footer actions */}
            <div className="sticky bottom-0 border-t border-paper-line bg-white px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={saveCaption} disabled={busy}>
                  Save edits
                </Button>
                {post.state === "draft" && (
                  <Button variant="secondary" size="sm" onClick={() => call("approve")} disabled={busy}>
                    Approve
                  </Button>
                )}
                <Button variant="gold" size="sm" onClick={() => call("publish")} disabled={busy}>
                  {busy ? "Publishing…" : "Publish now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
