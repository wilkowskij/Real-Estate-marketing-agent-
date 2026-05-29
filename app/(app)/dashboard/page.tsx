import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const QUICK = [
  { type: "just_sold", label: "Just Sold", desc: "Celebrate a closing" },
  { type: "new_listing", label: "New Listing", desc: "Announce to market" },
  { type: "open_house", label: "Open House", desc: "Invite the neighborhood" },
];

export default function DashboardPage() {
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
                <p className="mt-1 text-sm text-ink-muted">
                  Upload photos → finished post
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Up next</h3>
              <Link href="/calendar">
                <Button variant="ghost" size="sm">Open calendar</Button>
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              No posts scheduled yet. Turn on recurring local-market updates from
              the calendar to keep your feed alive between listings.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-lg text-navy">Trending nearby</h3>
            <p className="mt-3 text-sm text-ink-muted">
              Your strategy agent watches local real-estate news and broader
              trends, then drafts tasteful posts for your approval.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
