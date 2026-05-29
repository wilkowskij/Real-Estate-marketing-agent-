import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QueueItem } from "./QueueItem";

export const dynamic = "force-dynamic";

const JOB_LABEL: Record<string, { title: string; cadence: string; blurb: string }> = {
  local_news: {
    title: "Recurring: local market",
    cadence: "Weekly · review first",
    blurb:
      "Your strategy agent searches Monmouth County real-estate news each week and drafts a post. Nothing publishes without your approval unless you opt in.",
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
        supabase.from("recurring_jobs").select("id, kind, cadence, enabled").eq("org_id", ctx.orgId),
        supabase
          .from("posts")
          .select("id, platform, caption, state, scheduled_at")
          .eq("org_id", ctx.orgId)
          .in("state", ["draft", "approved", "scheduled"])
          .order("created_at", { ascending: false })
          .limit(25),
      ])
    : [{ data: [] }, { data: [] }];

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
        <Button variant="gold">New scheduled post</Button>
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
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm">Configure</Button>
                  <Button variant="ghost" size="sm">{job?.enabled === false ? "Resume" : "Pause"}</Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardBody>
          <h3 className="text-lg text-navy">Approval queue</h3>
          {queue && queue.length > 0 ? (
            <div className="mt-2 divide-y divide-paper-line">
              {queue.map((p) => (
                <QueueItem key={p.id} post={p} />
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
