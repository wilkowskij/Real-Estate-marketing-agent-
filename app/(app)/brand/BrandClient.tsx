"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "./ImageUpload";
import { BrandImport } from "./BrandImport";
import type { ResolvedBrand } from "@/lib/branding/resolveBrand";
import { US_STATES, COMMON_MLS } from "@/lib/branding/marketArea";

/**
 * Brand kit + agent profile editor, hydrated from the resolved brand. Company
 * brand fields are disabled for non-admins and for fields the org locked.
 */
export function BrandClient({
  brand,
  canEditBrand,
  lockedFields,
  logoLightUrl,
  logoDarkUrl,
  headshotUrl,
}: {
  brand: ResolvedBrand;
  canEditBrand: boolean;
  lockedFields: string[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  headshotUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(brand.name ?? "");
  const [colors, setColors] = useState(brand.colors);
  const [disclaimer, setDisclaimer] = useState(brand.disclaimer ?? "");
  const [marketState, setMarketState] = useState(brand.marketArea.state);
  const [county, setCounty] = useState(brand.marketArea.county);
  const [region, setRegion] = useState(brand.marketArea.region ?? "");
  const [towns, setTowns] = useState(brand.marketArea.towns.join(", "));
  const [mls, setMls] = useState(brand.marketArea.mls ?? "");
  const [fullName, setFullName] = useState(brand.agent.fullName ?? "");
  const [licenseNumber, setLicenseNumber] = useState(brand.agent.licenseNumber ?? "");
  const [phone, setPhone] = useState(brand.agent.contact.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const colorsLocked = lockedFields.includes("colors") && !canEditBrand;
  const brandDisabled = !canEditBrand;

  async function onSave() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        fullName,
        licenseNumber,
        contact: { ...brand.agent.contact, phone },
      };
      if (canEditBrand) {
        payload.name = name;
        payload.colors = colors;
        payload.disclaimer = disclaimer || null;
        payload.marketArea = {
          state: marketState,
          county: county.trim(),
          region: region.trim() || undefined,
          towns: towns
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          mls: mls.trim() || undefined,
        };
      }
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <>
      {canEditBrand && (
        <BrandImport
          onApply={(e) => {
            if (e.name) setName(e.name);
            setColors((c) => ({
              primary: e.colors.primary ?? c.primary,
              secondary: e.colors.secondary ?? c.secondary,
              accent: e.colors.accent ?? c.accent,
            }));
            if (e.disclaimer) setDisclaimer(e.disclaimer);
            setMsg("Imported from your brand guide — review and Save to apply.");
          }}
        />
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-navy">Identity</h3>
              {brandDisabled && <Badge>Locked by org</Badge>}
            </div>
            <div>
              <Label>Brand name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={brandDisabled}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <div key={k}>
                  <Label className="capitalize">{k}</Label>
                  <Input
                    type="color"
                    value={colors[k]}
                    onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
                    className="h-11 p-1"
                    disabled={colorsLocked || brandDisabled}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label>Disclaimer / brokerage line</Label>
              <Input
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                placeholder="Each office independently owned and operated."
                disabled={brandDisabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ImageUpload
                slot="logo_light"
                label="Logo (light bg)"
                currentUrl={logoLightUrl}
                disabled={brandDisabled}
              />
              <ImageUpload
                slot="logo_dark"
                label="Logo (dark bg)"
                currentUrl={logoDarkUrl}
                disabled={brandDisabled}
                dark
              />
            </div>
            {brandDisabled && (
              <p className="text-xs text-ink-muted">
                Company logos are managed by your org admin.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg text-navy">Agent details</h3>
            <ImageUpload slot="headshot" label="Headshot" currentUrl={headshotUrl} />
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wilkowski" />
            </div>
            <div>
              <Label>License #</Label>
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="NJ-1234567"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(732) 555-0142" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg text-navy">Market area</h3>
              <p className="text-sm text-ink-muted">
                Where you sell. This tailors every AI-generated post, email, and
                SMS — the towns it references, the local angle, and the hashtags.
              </p>
            </div>
            {brandDisabled && <Badge>Locked by org</Badge>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>State</Label>
              <Select
                value={marketState}
                onChange={(e) => setMarketState(e.target.value)}
                disabled={brandDisabled}
              >
                {Object.entries(US_STATES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label} ({code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>County</Label>
              <Input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="Monmouth"
                disabled={brandDisabled}
              />
            </div>
          </div>
          <div>
            <Label>Region (optional)</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Jersey Shore"
              disabled={brandDisabled}
            />
          </div>
          <div>
            <Label>Key towns you serve</Label>
            <Input
              value={towns}
              onChange={(e) => setTowns(e.target.value)}
              placeholder="Red Bank, Asbury Park, Middletown, Holmdel"
              disabled={brandDisabled}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Comma-separated. The AI names these towns for hyperlocal angles.
            </p>
          </div>
          <div>
            <Label>Your MLS</Label>
            <Input
              value={mls}
              onChange={(e) => setMls(e.target.value)}
              placeholder="Monmouth-Ocean MLS (MOMLS)"
              list="mls-suggestions"
              disabled={brandDisabled}
            />
            <datalist id="mls-suggestions">
              {COMMON_MLS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-ink-muted">
              The MLS you belong to. Listing imports default to your state above,
              and this labels where your listing data comes from.
            </p>
          </div>
          {brandDisabled && (
            <p className="text-xs text-ink-muted">
              Your org admin sets the company market area.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-ink-muted">{msg}</p>}
        <Button variant="gold" size="lg" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save brand kit"}
        </Button>
      </div>
    </>
  );
}
