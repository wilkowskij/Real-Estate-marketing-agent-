import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { BrandClient } from "./BrandClient";

export const dynamic = "force-dynamic";

/**
 * Brand kit editor (Standard tier). For a company org, admins edit the company
 * brand and can lock fields; members see locked fields read-only but always
 * control their personal profile. Hydrated from the resolved brand.
 */
export default async function BrandPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const canEditBrand = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Brand kit</p>
      <h1 className="mt-2 text-4xl text-navy">Make every post unmistakably yours.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Company or solo — these colors, type, logo, and details flow into every
        graphic your agents create.
      </p>

      <BrandClient
        brand={ctx.brand}
        canEditBrand={canEditBrand}
        lockedFields={ctx.orgKit.locked_fields ?? []}
      />
    </div>
  );
}
