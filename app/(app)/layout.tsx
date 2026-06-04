import { AppShell, type ShellBrand } from "@/components/AppShell";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { areaLabel } from "@/lib/branding/marketArea";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();

  // When white-label is on, theme the shell with the org's brand. The dark-bg
  // logo suits the navy sidebar; fall back to the light one, then the name.
  let brand: ShellBrand | undefined;
  if (ctx?.brand.whiteLabel) {
    const supabase = createSupabaseServerClient();
    const logoUrl = await signedUrl(
      supabase,
      ctx.brand.logoDarkPath ?? ctx.brand.logoLightPath,
      3600
    );
    brand = {
      name: ctx.brand.name || "Studio",
      logoUrl,
      accent: ctx.brand.colors?.primary ?? null,
      areaLabel: areaLabel(ctx.brand.marketArea),
    };
  }

  return <AppShell brand={brand}>{children}</AppShell>;
}
