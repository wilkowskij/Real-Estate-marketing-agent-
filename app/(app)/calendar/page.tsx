import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Content calendar + automation. The recurring local-news and trend-watch jobs
 * (driven by Vercel Cron → /api/cron/*) drop drafts into the approval queue;
 * this view is where the agent reviews, schedules, and publishes.
 */
export default function CalendarPage() {
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
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Recurring: local market</h3>
              <Badge>Weekly · review first</Badge>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Your strategy agent searches Monmouth County real-estate news each
              week and drafts a post. Nothing publishes without your approval
              unless you opt in.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm">Configure</Button>
              <Button variant="ghost" size="sm">Pause</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Trend watch</h3>
              <Badge>Daily · review first</Badge>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Tasteful, on-brand takes on broader trends — scored for relevance
              to real estate in your area before they reach your queue.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm">Configure</Button>
              <Button variant="ghost" size="sm">Pause</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <h3 className="text-lg text-navy">Approval queue</h3>
          <p className="mt-3 text-sm text-ink-muted">
            Drafts awaiting your review will appear here. Approve to schedule or
            publish; edit the copy or swap the graphic before it goes out.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
