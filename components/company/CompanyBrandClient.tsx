"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/brand/ImageUpload";
import { BrandImport } from "@/components/brand/BrandImport";
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
        body: JSON.stringify({ name, colors, disclaimer: disclaimer || null }),
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
