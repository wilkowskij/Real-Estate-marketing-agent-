import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const QUICK = [
  { type: "just_sold", label: "Just Sold", desc: "Celebrate a closing" },
  { type: "new_listing", label: "New Listing", desc: "Announce to market" },
  { type: "open_house", label: "Open House", desc: "Invite the neighborhood" },
];

const TYPE_LABEL: Record<string, string> = {
  just_sold: "Just Sold",
  new_listing: "New Listing",
  open_house: "Open House",
  custom: "Custom",
};

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  const [{ data: campaigns }, { data: upcoming }, { data: trends }] = ctx
    ? await Promise.all([
        supabase
          .from("campaigns")
          .select("id, type, status, created_at")
          .eq("org_id", ctx.orgId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("posts")
          .select("id, platform, scheduled_at, state")
          .eq("org_id", ctx.orgId)
          .in("state", ["approved", "scheduled"])
          .order("scheduled_at", { ascending: true })
          .limit(5),
        supabase
          .from("trends")
          .select("id, topic, relevance")
          .order("created_at", { ascending: false })
          .limit(4),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">The Studio</p>
      <h1 className="mt-2 text-4xl text-navy">Make something worth sharing.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Start a campaign from a listing, or let your strategy agent line up this
        week&apos;s local-market posts.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {QUICK.map((q) => (
          <Link key={q.type} href={`/generate?type=${q.type}`}>
            <Card className="h-full transition-shadow hover:shadow-lift">
              <CardBody>
                <Badge>{q.label}</Badge>
                <p className="mt-4 font-display text-xl text-navy">{q.desc}</p>
                <p className="mt-1 text-sm text-ink-muted">Upload photos → finished post</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {campaigns && campaigns.length > 0 && (
        <Card className="mt-10">
          <CardBody>
            <h3 className="text-lg text-navy">Recent campaigns</h3>
            <div className="mt-3 divide-y divide-paper-line">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-ink">{TYPE_LABEL[c.type] ?? c.type}</span>
                  <div className="flex items-center gap-3">
                    <Badge>{c.status}</Badge>
                    <span className="text-xs text-ink-muted">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Up next</h3>
              <Link href="/calendar">
                <Button variant="ghost" size="sm">Open calendar</Button>
              </Link>
            </div>
            {upcoming && upcoming.length > 0 ? (
              <div className="mt-3 space-y-2">
                {upcoming.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink">{p.platform}</span>
                    <span className="text-xs text-ink-muted">
                      {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : p.state}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                No posts scheduled yet. Turn on recurring local-market updates from the
                calendar to keep your feed alive between listings.
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-lg text-navy">Trending nearby</h3>
            {trends && trends.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {trends.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{t.topic}</span>
                    {t.relevance != null && (
                      <span className="text-xs text-gold-deep">
                        {Math.round(Number(t.relevance) * 100)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Your strategy agent watches local real-estate news and broader trends,
                then drafts tasteful posts for your approval.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
