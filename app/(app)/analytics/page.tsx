import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contentMixFromCounts, summarizeFunnel } from "@/lib/analytics/summary";

export const dynamic = "force-dynamic";

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📸", facebook: "👍", linkedin: "💼", twitter: "𝕏", x: "𝕏",
};

const SOURCE_LABEL: Record<string, string> = {
  landing: "Landing page", open_house: "Open house", qr: "QR code",
  manual: "Manual", unattributed: "Unattributed",
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-1 font-display text-3xl text-navy">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </CardBody>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  // All aggregation happens in one RLS-safe SQL call (no full-table loads).
  const { data: overview } = ctx
    ? await supabase.rpc("analytics_overview", { p_org: ctx.orgId })
    : { data: null };
  const ov = (overview as any) ?? {};

  const prod = ov.production ?? {};
  const production = {
    totalPosts: prod.total ?? 0,
    published: prod.published ?? 0,
    scheduled: prod.scheduled ?? 0,
    drafts: prod.drafts ?? 0,
    last30: prod.last30 ?? 0,
    byPlatform: (prod.byPlatform ?? {}) as Record<string, number>,
  };
  const genCount = ov.aiMonth ?? 0;
  const mix = contentMixFromCounts(ov.typeCounts ?? {});

  const engTotals = ov.engagement?.totals ?? {};
  const eImp = engTotals.impressions ?? 0;
  const engagement = {
    hasData: ov.engagement?.hasData ?? false,
    totals: {
      impressions: eImp,
      likes: engTotals.likes ?? 0,
      comments: engTotals.comments ?? 0,
      shares: engTotals.shares ?? 0,
      saves: engTotals.saves ?? 0,
      clicks: engTotals.clicks ?? 0,
      engagementRate:
        eImp > 0
          ? ((engTotals.likes ?? 0) + (engTotals.comments ?? 0) + (engTotals.shares ?? 0) + (engTotals.saves ?? 0)) / eImp
          : 0,
    },
    topPosts: (ov.engagement?.topPosts ?? []) as { postId: string; platform: string; engagements: number }[],
  };

  const rev = ov.revenue ?? {};
  const revenue = {
    hasData: (ov.funnel?.deals ?? 0) > 0,
    wonValue: Number(rev.wonValue ?? 0),
    wonCount: rev.wonCount ?? 0,
    pipelineValue: Number(rev.pipelineValue ?? 0),
    openCount: rev.openCount ?? 0,
    lostCount: rev.lostCount ?? 0,
    bySource: ((rev.bySource ?? []) as { source: string; deals: number; wonValue: number }[]).map((r) => ({
      source: SOURCE_LABEL[r.source] ?? r.source,
      deals: r.deals,
      wonValue: Number(r.wonValue ?? 0),
    })),
  };

  const f = ov.funnel ?? {};
  const funnel = summarizeFunnel(f.clicks ?? 0, f.leads ?? 0, f.deals ?? 0, f.won ?? 0);

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const usd = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n.toLocaleString()}`;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Analytics</p>
      <h1 className="mt-2 text-4xl text-navy">What's working.</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Your content production at a glance, plus engagement as it comes in from
        connected accounts.
      </p>

      {/* Production stats */}
      <h2 className="mt-8 font-display text-lg text-navy">Production</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total posts" value={production.totalPosts} hint={`${production.last30} in last 30 days`} />
        <Stat label="Published" value={production.published} />
        <Stat label="Scheduled" value={production.scheduled} />
        <Stat label="AI generations" value={genCount ?? 0} hint="this month" />
      </div>

      {/* Channel breakdown */}
      {Object.keys(production.byPlatform).length > 0 && (
        <Card className="mt-4">
          <CardBody>
            <p className="eyebrow mb-3">By channel</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(production.byPlatform).map(([platform, n]) => (
                <div key={platform} className="flex items-center gap-2 text-sm text-ink-soft">
                  <span>{PLATFORM_ICON[platform] ?? "📄"}</span>
                  <span className="capitalize">{platform}</span>
                  <Badge>{n}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Content mix actual vs target */}
      <h2 className="mt-8 font-display text-lg text-navy">Content mix</h2>
      <p className="mt-1 text-sm text-ink-muted">How your generated campaigns balance against the research-based target.</p>
      <Card className="mt-3">
        <CardBody className="space-y-3">
          {mix.every((m) => m.count === 0) ? (
            <p className="text-sm text-ink-muted">
              No campaigns generated yet — your content mix will appear here as you create.
            </p>
          ) : (
            mix.map((m) => (
              <div key={m.bucket}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{m.label}</span>
                  <span className="text-xs text-ink-muted">
                    {m.count} · {pct(m.actualShare)} <span className="opacity-60">/ target {pct(m.targetShare)}</span>
                  </span>
                </div>
                {/* actual vs target bar */}
                <div className="relative mt-1 h-2 w-full rounded-full bg-paper">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gold"
                    style={{ width: pct(m.actualShare) }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-navy/50"
                    style={{ left: pct(m.targetShare) }}
                    title={`Target ${pct(m.targetShare)}`}
                  />
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Engagement */}
      <h2 className="mt-8 font-display text-lg text-navy">Engagement</h2>
      {!engagement.hasData ? (
        <Card className="mt-3">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No engagement data yet. Once a social account is connected and posts
              are published, daily insights (impressions, likes, comments, shares)
              will populate here automatically.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Impressions" value={engagement.totals.impressions.toLocaleString()} />
            <Stat label="Engagements" value={(engagement.totals.likes + engagement.totals.comments + engagement.totals.shares + engagement.totals.saves).toLocaleString()} />
            <Stat label="Engagement rate" value={pct(engagement.totals.engagementRate)} />
            <Stat label="Link clicks" value={engagement.totals.clicks.toLocaleString()} />
          </div>
          {engagement.topPosts.length > 0 && (
            <Card className="mt-4">
              <CardBody>
                <p className="eyebrow mb-3">Top posts</p>
                <div className="divide-y divide-paper-line">
                  {engagement.topPosts.map((p) => (
                    <div key={p.postId} className="flex items-center justify-between py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span>{PLATFORM_ICON[p.platform] ?? "📄"}</span>
                        <span className="capitalize text-ink-soft">{p.platform}</span>
                      </span>
                      <Badge>{p.engagements} engagements</Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Revenue & attribution */}
      <h2 className="mt-8 font-display text-lg text-navy">Revenue &amp; attribution</h2>
      <p className="mt-1 text-sm text-ink-muted">From click to lead to closed deal — and what produced it.</p>

      {/* Funnel */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Clicks", value: funnel.clicks.toLocaleString(), rate: null },
          { label: "Leads", value: funnel.leads.toLocaleString(), rate: `${pct(funnel.clickToLead)} of clicks` },
          { label: "Deals", value: funnel.deals.toLocaleString(), rate: `${pct(funnel.leadToDeal)} of leads` },
          { label: "Won", value: funnel.won.toLocaleString(), rate: `${pct(funnel.dealToWon)} of deals` },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{s.label}</p>
              <p className="mt-1 font-display text-3xl text-navy">{s.value}</p>
              {s.rate && <p className="mt-1 text-xs text-ink-muted">{s.rate}</p>}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Revenue */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Closed revenue" value={usd(revenue.wonValue)} hint={`${revenue.wonCount} won`} />
        <Stat label="Open pipeline" value={usd(revenue.pipelineValue)} hint={`${revenue.openCount} active`} />
        <Stat label="Deals lost" value={revenue.lostCount} />
      </div>

      {revenue.hasData ? (
        <Card className="mt-4">
          <CardBody>
            <p className="eyebrow mb-3">Closed revenue by source</p>
            <div className="divide-y divide-paper-line">
              {revenue.bySource.map((r) => (
                <div key={r.source} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-soft">{r.source}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">{r.deals} deal{r.deals !== 1 ? "s" : ""}</span>
                    <Badge>{usd(r.wonValue)}</Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No deals yet. Convert a lead into a deal from the{" "}
              <a href="/leads" className="text-gold-deep hover:underline">Leads</a> hub, and
              closed revenue will be attributed to its source here.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
