"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input } from "@/components/ui/Field";
import { ImageUpload } from "@/components/brand/ImageUpload";
import type { ResolvedBrand } from "@/lib/branding/resolveBrand";

/**
 * Personal agent profile editor — headshot, name, license, and contact. These
 * are always the user's own (no admin gating); they layer over the company
 * brand when graphics are rendered.
 */
export function ProfileClient({
  brand,
  headshotUrl,
}: {
  brand: ResolvedBrand;
  headshotUrl: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(brand.agent.fullName ?? "");
  const [licenseNumber, setLicenseNumber] = useState(brand.agent.licenseNumber ?? "");
  const [phone, setPhone] = useState(brand.agent.contact.phone ?? "");
  const [email, setEmail] = useState(brand.agent.contact.email ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          licenseNumber,
          contact: { ...brand.agent.contact, phone, email },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      setMsg("Saved.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl text-navy">My details</h2>
      <Card className="mt-6">
        <CardBody className="space-y-4">
          <ImageUpload slot="headshot" label="Headshot" currentUrl={headshotUrl} />
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wilkowski" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>License #</Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="NJ-1234567" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(732) 555-0142" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@brokerage.com" />
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-3">
        {error && <p className="text-sm text-error">{error}</p>}
        {msg && <p className="text-sm text-ink-muted">{msg}</p>}
        <Button variant="gold" size="lg" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
