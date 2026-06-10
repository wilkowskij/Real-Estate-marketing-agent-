import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { Card, CardBody } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const STATE_COLOR: Record<string, string> = {
  draft:     "bg-ink-muted",
  approved:  "bg-blue-400",
  scheduled: "bg-gold",
  published: "bg-green-500",
  failed:    "bg-error",
};

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📸",
  facebook:  "👍",
  linkedin:  "💼",
  x:         "𝕏",
};

const TYPE_LABEL: Record<string, string> = {
  just_sold:              "Just Sold",
  new_listing:            "New Listing",
  open_house:             "Open House",
  market_stat:            "Market Stat",
  neighborhood_spotlight: "Neighborhood",
  deal_of_week:           "Deal of Week",
  before_after:           "Before/After",
  educational:            "Educational",
  testimonial:            "Testimonial",
  custom:                 "Custom",
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

export default async function AnalyticsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const supabase = createSupabaseServerClient();

  const [{ data: posts }, { data: campaigns }, { count: mcCount }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, state, platform, created_at, scheduled_at")
        .eq("org_id", ctx.orgId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("campaigns")
        .select("id, type, status, created_at")
        .eq("org_id", ctx.orgId)
        .limit(500),
      supabase
        .from("marketing_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("org_id", ctx.orgId),
    ]);

  const allPosts = posts ?? [];
  const allCampaigns = campaigns ?? [];

  // State breakdown
  const byState = allPosts.reduce<Record<string, number>>((acc, p) => {
    acc[p.state] = (acc[p.state] ?? 0) + 1;
    return acc;
  }, {});

  // Platform breakdown
  const byPlatform = allPosts.reduce<Record<string, number>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] ?? 0) + 1;
    return acc;
  }, {});
  const totalByPlatform = Object.values(byPlatform).reduce<number>((s, n) => s + (n as number), 0);

  // Monthly output (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const count = allPosts.filter((p) => {
      if (!p.created_at) return false;
      const c = new Date(p.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    return { label: monthLabel(d), count };
  });
  const maxMonthCount = Math.max(...months.map((m) => m.count), 1);

  // Content type breakdown
  const byType = allCampaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});
  const totalByType = Object.values(byType).reduce<number>((s, n) => s + (n as number), 0);

  const publishedCount = byState.published ?? 0;
  const totalPosts = allPosts.length;
  const publishRate = pct(publishedCount, totalPosts);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="eyebrow">Analytics</p>
        <h1 className="mt-2 text-4xl text-navy">Content performance.</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total posts",  value: totalPosts },
          { label: "Published",    value: publishedCount },
          { label: "Scheduled",    value: byState.scheduled ?? 0 },
          { label: "Campaigns",    value: mcCount ?? 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardBody className="text-center">
              <p className="font-display text-3xl text-navy">{value}</p>
              <p className="mt-1 text-xs text-ink-muted">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Monthly output bar chart */}
      <Card>
        <CardBody>
          <p className="eyebrow mb-4">Monthly content output</p>
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {months.map(({ label, count }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                {count > 0 && <span className="text-xs text-ink-muted">{count}</span>}
                <div className="flex w-full flex-col justify-end" style={{ flex: 1 }}>
                  <div
                    className="w-full rounded-t bg-gold transition-all"
                    style={{
                      height: `${(count / maxMonthCount) * 72}px`,
                      minHeight: count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs text-ink-muted">{label}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Platform + State */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="eyebrow mb-4">Posts by platform</p>
            {totalByPlatform === 0 ? (
              <p className="text-sm text-ink-muted">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byPlatform)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <span className="w-5 text-center text-sm">
                        {PLATFORM_ICON[platform] ?? "📄"}
                      </span>
                      <span className="w-24 text-sm capitalize text-ink">{platform}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${pct(count as number, totalByPlatform)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-muted">{count as number}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="eyebrow mb-4">Posts by status</p>
            {totalPosts === 0 ? (
              <p className="text-sm text-ink-muted">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byState)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([state, count]) => (
                    <div key={state} className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${STATE_COLOR[state] ?? "bg-ink-muted"}`}
                      />
                      <span className="w-24 text-sm capitalize text-ink">{state}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                        <div
                          className={`h-full rounded-full ${STATE_COLOR[state] ?? "bg-ink-muted"}`}
                          style={{ width: `${pct(count as number, totalPosts)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-muted">{count as number}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Content type mix */}
      {(totalByType as number) > 0 && (
        <Card>
          <CardBody>
            <p className="eyebrow mb-4">Content type mix</p>
            <div className="space-y-3">
              {Object.entries(byType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-ink">{TYPE_LABEL[type] ?? type}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                      <div
                        className="h-full rounded-full bg-navy/40"
                        style={{ width: `${pct(count as number, totalByType as number)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-ink-muted">
                      {pct(count as number, totalByType as number)}%
                    </span>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Publish rate */}
      {totalPosts > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Publish rate</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Posts that went live out of all created.
                </p>
              </div>
              <p className="font-display text-3xl text-navy">{publishRate}%</p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${publishRate}%` }}
              />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
