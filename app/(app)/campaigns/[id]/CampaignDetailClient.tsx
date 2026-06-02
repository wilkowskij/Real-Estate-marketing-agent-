"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";

interface Campaign {
  id: string;
  name: string;
  objective: string | null;
  status: "active" | "completed" | "archived";
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}
interface PostRow {
  id: string;
  platform: string;
  caption: string | null;
  state: string;
  scheduled_at: string | null;
}
interface MessageRow {
  id: string;
  channel: "email" | "sms";
  campaign_type: string;
  content: { subject?: string; body?: string; message?: string };
  state: string;
  created_at: string;
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📸", facebook: "👍", linkedin: "💼", twitter: "𝕏", x: "𝕏",
};

export function CampaignDetailClient({
  campaign,
  posts,
  messages,
}: {
  campaign: Campaign;
  posts: PostRow[];
  messages: MessageRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [objective, setObjective] = useState(campaign.objective ?? "");
  const [status, setStatus] = useState(campaign.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective: objective || null, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this campaign? Attached posts are kept; saved emails/texts are removed.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      router.push("/campaigns");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const channelCounts = {
    posts: posts.length,
    email: messages.filter((m) => m.channel === "email").length,
    sms: messages.filter((m) => m.channel === "sms").length,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/campaigns" className="text-sm text-gold-deep hover:underline">
        ← All campaigns
      </Link>

      {/* Header / editor */}
      <Card className="mt-4">
        <CardBody>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Campaign name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Strategy / objective</Label>
                <Textarea rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div className="max-w-xs">
                <Label>Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as Campaign["status"])}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-2">
                <Button variant="gold" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </Button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="ml-auto text-sm text-error hover:underline disabled:opacity-50"
                >
                  Delete campaign
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl text-navy">{campaign.name}</h1>
                    <Badge>{campaign.status}</Badge>
                  </div>
                  {campaign.objective && (
                    <p className="mt-2 max-w-2xl text-sm text-ink-muted">{campaign.objective}</p>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
              <div className="mt-4 flex gap-5 text-sm text-ink-soft">
                <span>📱 {channelCounts.posts} social</span>
                <span>✉️ {channelCounts.email} email</span>
                <span>💬 {channelCounts.sms} SMS</span>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Social posts */}
      <h2 className="mt-8 font-display text-lg text-navy">Social posts</h2>
      {posts.length === 0 ? (
        <Card className="mt-2">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No posts attached yet. Open a post in the{" "}
              <Link href="/calendar" className="text-gold-deep hover:underline">calendar queue</Link>{" "}
              and add it to this campaign.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-2">
          <CardBody className="divide-y divide-paper-line">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{PLATFORM_ICON[p.platform] ?? "📄"}</span>
                    <span className="text-sm font-medium capitalize text-ink">{p.platform}</span>
                    <Badge>{p.state}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.caption}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Email & SMS */}
      <h2 className="mt-8 font-display text-lg text-navy">Email &amp; SMS</h2>
      {messages.length === 0 ? (
        <Card className="mt-2">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No messages yet. Generate an email or text in{" "}
              <Link href="/generate" className="text-gold-deep hover:underline">Create</Link>{" "}
              and save it to this campaign.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-2 space-y-3">
          {messages.map((m) => (
            <Card key={m.id}>
              <CardBody>
                <div className="flex items-center gap-2">
                  <span>{m.channel === "email" ? "✉️" : "💬"}</span>
                  <span className="text-sm font-medium capitalize text-ink">{m.channel}</span>
                  <Badge>{m.campaign_type.replace(/_/g, " ")}</Badge>
                </div>
                {m.channel === "email" ? (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-ink">{m.content.subject}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted line-clamp-4">
                      {m.content.body}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">{m.content.message}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Tracked links */}
      <TrackedLinks campaignId={campaign.id} />
    </div>
  );
}

interface LinkRow {
  id: string;
  slug: string;
  destination: string;
  label: string | null;
  clicks: number;
}

/** Per-campaign tracked links: create a /r/<slug> short link and watch clicks. */
function TrackedLinks({ campaignId }: { campaignId: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [destination, setDestination] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const res = await fetch(`/api/tracked-links?campaignId=${campaignId}`);
    if (res.ok) setLinks((await res.json()).links ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function create() {
    if (!destination.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tracked-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, label: label || undefined, marketingCampaignId: campaignId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not create");
      setDestination("");
      setLabel("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="mt-8 font-display text-lg text-navy">Tracked links</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Use these as your post / email CTA — clicks are counted and feed the
        attribution funnel in Analytics.
      </p>

      <Card className="mt-3">
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <Label>Destination URL</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="https://yoursite.com/14-riverside-ave" />
            </div>
            <div className="w-40">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="IG bio" />
            </div>
            <Button variant="secondary" onClick={create} disabled={busy || !destination.trim()}>
              {busy ? "Adding…" : "Add link"}
            </Button>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}

          {links.length > 0 && (
            <div className="divide-y divide-paper-line">
              {links.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      {origin}/r/{l.slug}
                      {l.label ? <span className="text-ink-muted"> · {l.label}</span> : null}
                    </p>
                    <p className="truncate text-xs text-ink-muted">→ {l.destination}</p>
                  </div>
                  <Badge>{l.clicks} click{l.clicks !== 1 ? "s" : ""}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
