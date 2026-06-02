import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { CompanyBrandClient } from "@/components/company/CompanyBrandClient";

export const dynamic = "force-dynamic";

/**
 * Company → Brand & documents. Admins edit the company brand, upload the brand
 * guide, and can lock fields; members see locked fields read-only. Personal
 * agent details live under the user Profile.
 */
export default async function CompanyBrandPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const canEditBrand = ctx.role === "owner" || ctx.role === "admin";

  const supabase = createSupabaseServerClient();
  const [logoLightUrl, logoDarkUrl] = await Promise.all([
    signedUrl(supabase, ctx.brand.logoLightPath),
    signedUrl(supabase, ctx.brand.logoDarkPath),
  ]);

  return (
    <CompanyBrandClient
      brand={ctx.brand}
      canEditBrand={canEditBrand}
      lockedFields={ctx.orgKit.locked_fields ?? []}
      logoLightUrl={logoLightUrl}
      logoDarkUrl={logoDarkUrl}
    />
  );
}
