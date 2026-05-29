import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

/**
 * Brand kit editor (Standard tier). For a company org, admins can lock fields;
 * members see locked fields as read-only. This page renders the form shell;
 * persistence wires to /api/brand (to be added) using the resolved brand.
 */
export default function BrandPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Brand kit</p>
      <h1 className="mt-2 text-4xl text-navy">Make every post unmistakably yours.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Company or solo — these colors, type, logo, and details flow into every
        graphic your agents create.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Identity</h3>
              <Badge>Locked by org</Badge>
            </div>
            <div>
              <Label>Brand name</Label>
              <Input defaultValue="Marquee Realty" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Primary</Label>
                <Input type="color" defaultValue="#0e1a2b" className="h-11 p-1" />
              </div>
              <div>
                <Label>Secondary</Label>
                <Input type="color" defaultValue="#3a4250" className="h-11 p-1" />
              </div>
              <div>
                <Label>Accent</Label>
                <Input type="color" defaultValue="#b08d4f" className="h-11 p-1" />
              </div>
            </div>
            <div>
              <Label>Logo</Label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-paper-line py-6 text-sm text-ink-muted hover:border-gold/60">
                Upload light & dark logo
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg text-navy">Agent details</h3>
            <div>
              <Label>Full name</Label>
              <Input placeholder="Jane Wilkowski" />
            </div>
            <div>
              <Label>License #</Label>
              <Input placeholder="NJ-1234567" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="(732) 555-0142" />
            </div>
            <div>
              <Label>Headshot</Label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-paper-line py-6 text-sm text-ink-muted hover:border-gold/60">
                Upload headshot
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div>
              <Label>Disclaimer / brokerage line</Label>
              <Input placeholder="Each office independently owned and operated." />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="gold" size="lg">Save brand kit</Button>
      </div>
    </div>
  );
}
