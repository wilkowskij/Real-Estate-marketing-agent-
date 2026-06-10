"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/brand/ImageUpload";
import { BrandImport } from "@/components/brand/BrandImport";
import { US_STATES, COMMON_MLS } from "@/lib/branding/marketArea";
import type { ResolvedBrand } from "@/lib/branding/resolveBrand";

/**
 * Company brand editor: name, colors, disclaimer, logos, and brand-guide import.
 * Personal agent details (headshot/name/license) live in the user Profile, not
 * here. Fields are disabled for non-admins and for org-locked fields.
 */
export function CompanyBrandClient({
  brand,
  canEditBrand,
  lockedFields,
  logoLightUrl,
  logoDarkUrl,
}: {
  brand: ResolvedBrand;
  canEditBrand: boolean;
  lockedFields: string[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(brand.name ?? "");
  const [colors, setColors] = useState(brand.colors);
  const [disclaimer, setDisclaimer] = useState(brand.disclaimer ?? "");
  const [whiteLabel, setWhiteLabel] = useState(brand.whiteLabel);
  const [marketState, setMarketState] = useState(brand.marketArea.state);
  const [county, setCounty] = useState(brand.marketArea.county);
  const [region, setRegion] = useState(brand.marketArea.region ?? "");
  const [towns, setTowns] = useState(brand.marketArea.towns.join(", "));
  const [mls, setMls] = useState(brand.marketArea.mls ?? "");
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
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          colors,
          disclaimer: disclaimer || null,
          whiteLabel,
          marketArea: {
            state: marketState,
            county: county.trim(),
            region: region.trim() || undefined,
            towns: towns.split(",").map((t) => t.trim()).filter(Boolean),
            mls: mls.trim() || undefined,
          },
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
      <h2 className="text-2xl text-navy">Brand &amp; documents</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Upload your brand guide and set the colors, logos, and disclaimer that
        flow into every graphic your agents create.
      </p>

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
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={brandDisabled} />
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
            <label className="flex items-start gap-3 rounded-lg border border-paper-line p-3">
              <input
                type="checkbox"
                checked={whiteLabel}
                onChange={(e) => setWhiteLabel(e.target.checked)}
                disabled={brandDisabled}
                className="mt-0.5 h-4 w-4 accent-gold-deep"
              />
              <span className="text-sm">
                <span className="font-medium text-ink">White-label the app</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Show your logo and name across the app instead of “Marquee”. Uses your
                  dark-background logo (or your brand name) in the sidebar.
                </span>
              </span>
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg text-navy">Logos</h3>
            <div className="grid grid-cols-2 gap-3">
              <ImageUpload slot="logo_light" label="Logo (light bg)" currentUrl={logoLightUrl} disabled={brandDisabled} />
              <ImageUpload slot="logo_dark" label="Logo (dark bg)" currentUrl={logoDarkUrl} disabled={brandDisabled} dark />
            </div>
            {brandDisabled && (
              <p className="text-xs text-ink-muted">Company logos are managed by your org admin.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg text-navy">Market area &amp; MLS</h3>
              <p className="text-sm text-ink-muted">
                Where you sell. This tailors every AI-generated post, email, and
                SMS — the towns it references, the local angle, the hashtags —
                and sets which state listing imports pull from.
              </p>
            </div>
            {brandDisabled && <Badge>Locked by org</Badge>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>State</Label>
              <Select value={marketState} onChange={(e) => setMarketState(e.target.value)} disabled={brandDisabled}>
                {Object.entries(US_STATES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label} ({code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>County</Label>
              <Input value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Monmouth" disabled={brandDisabled} />
            </div>
          </div>
          <div>
            <Label>Region (optional)</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Jersey Shore" disabled={brandDisabled} />
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
              The MLS you belong to. Listing imports default to the state above,
              and listing posts can carry its attribution.
            </p>
          </div>
          {brandDisabled && (
            <p className="text-xs text-ink-muted">Your org admin sets the company market area.</p>
          )}
        </CardBody>
      </Card>

      {canEditBrand && (
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <p className="text-sm text-error">{error}</p>}
          {msg && <p className="text-sm text-ink-muted">{msg}</p>}
          <Button variant="gold" size="lg" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save brand kit"}
          </Button>
        </div>
      )}
    </div>
  );
}
