import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QueueItem } from "./QueueItem";
import { RecurringJobControls, type RecurringJobRow } from "./RecurringJobControls";
import { PlanMonthButton } from "./PlanMonthButton";
import { ListingSequenceForm } from "./ListingSequenceForm";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

const PLATFORM_META: Record<string, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "📸" },
  facebook: { label: "Facebook", icon: "👍" },
  linkedin: { label: "LinkedIn", icon: "💼" },
  twitter: { label: "X", icon: "𝕏" },
  x: { label: "X", icon: "𝕏" },
};
const PLATFORM_SORT = ["instagram", "facebook", "linkedin", "twitter", "x"];

type QPost = { id: string; platform: string; caption: string | null; state: string; scheduled_at: string | null };

/** Group queue posts by platform, ordered by the canonical platform sort. */
function groupByPlatform(posts: QPost[]): [string, QPost[]][] {
  const groups = new Map<string, QPost[]>();
  for (const p of posts) {
    if (!groups.has(p.platform)) groups.set(p.platform, []);
    groups.get(p.platform)!.push(p);
  }
  const rank = (k: string) => {
    const i = PLATFORM_SORT.indexOf(k);
    return i === -1 ? 999 : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

const JOB_LABEL: Record<string, { title: string; cadence: string; blurb: string }> = {
  local_news: {
    title: "Recurring: local market",
    cadence: "Weekly · review first",
    blurb:
      "Your strategy agent searches your market's real-estate news each week and drafts a post. Nothing publishes without your approval unless you opt in.",
  },
  trend_watch: {
    title: "Trend watch",
    cadence: "Daily · review first",
    blurb:
      "Tasteful, on-brand takes on broader trends — scored for relevance to real estate in your area before they reach your queue.",
  },
};

/**
 * Content calendar + automation. Recurring local-news / trend-watch jobs drop
 * drafts into the approval queue; this view is where the agent reviews,
 * schedules, and publishes.
 */
export default async function CalendarPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  const [{ data: jobs }, { data: queue }] = ctx
    ? await Promise.all([
        supabase
          .from("recurring_jobs")
          .select("id, kind, cadence, config, auto_publish, auto_approve, enabled")
          .eq("org_id", ctx.orgId),
        supabase
          .from("posts")
          .select("id, platform, caption, state, scheduled_at, is_brokerage_push")
          .eq("org_id", ctx.orgId)
          .in("state", ["draft", "approved", "scheduled"])
          .order("created_at", { ascending: false })
          .limit(25),
      ])
    : [{ data: [] }, { data: [] }];

  const JOB_LABEL = buildJobLabels(ctx?.orgArea ?? "your area");
  const isAdmin = ctx?.role === "admin" || ctx?.role === "owner";
  // Always show both automation cards; merge any configured jobs over defaults.
  const kinds = ["local_news", "trend_watch"] as const;
  const jobByKind = new Map((jobs ?? []).map((j) => [j.kind, j]));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 className="mt-2 text-4xl text-navy">Keep the feed alive.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton />
          <PlanMonthButton />
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {kinds.map((kind) => {
          const meta = JOB_LABEL[kind];
          const job = jobByKind.get(kind);
          return (
            <Card key={kind}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-navy">{meta.title}</h3>
                  <Badge>{job?.enabled === false ? "Paused" : meta.cadence}</Badge>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{meta.blurb}</p>
                <RecurringJobControls
                  kind={kind}
                  job={(job as RecurringJobRow | undefined) ?? null}
                />
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg text-navy">Approval queue</h3>
            <ListingSequenceForm />
          </div>
          {queue && queue.length > 0 ? (
            <div className="mt-3 space-y-6">
              {groupByPlatform(queue).map(([platform, posts]) => (
                <div key={platform}>
                  <div className="flex items-center gap-2 border-b border-paper-line pb-2">
                    <span>{PLATFORM_META[platform]?.icon ?? "📄"}</span>
                    <h4 className="text-sm font-semibold capitalize text-navy">
                      {PLATFORM_META[platform]?.label ?? platform}
                    </h4>
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-muted">
                      {posts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-paper-line">
                    {posts.map((p) => (
                      <QueueItem key={p.id} post={p} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Drafts awaiting your review will appear here. Approve to schedule or
              publish; edit the copy or swap the graphic before it goes out.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
