import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Team / org management. Owners & admins invite agents, set roles, and lock
 * brand fields so the whole brokerage stays on-brand. Solo accounts are an
 * org-of-one and can ignore this screen.
 */
export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Team</p>
      <h1 className="mt-2 text-4xl text-navy">Your brokerage, on brand.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Invite agents and decide which brand elements they can personalize and
        which stay locked to the company standard.
      </p>

      <Card className="mt-8">
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="text-lg text-navy">Members</h3>
            <Button variant="gold" size="sm">Invite agent</Button>
          </div>
          <div className="mt-4 divide-y divide-paper-line">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
                <div>
                  <p className="text-sm font-medium text-ink">You</p>
                  <p className="text-xs text-ink-muted">Owner</p>
                </div>
              </div>
              <Badge>Owner</Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h3 className="text-lg text-navy">Locked brand fields</h3>
          <p className="mt-3 text-sm text-ink-muted">
            Logo, colors, fonts, and disclaimer can be locked so members inherit
            them and cannot override. Personal details (headshot, contact) always
            belong to each agent.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
