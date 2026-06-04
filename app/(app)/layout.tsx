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

  // The sidebar always reflects the org's real market area (not a hardcoded one).
  const market = ctx ? areaLabel(ctx.brand.marketArea) : undefined;

  // When white-label is on, theme the shell with the org's brand. We resolve
  // both logo variants so each surface uses the legible one: the dark-bg logo on
  // the navy sidebar/drawer, the light-bg logo on the light mobile header.
  let brand: ShellBrand | undefined;
  if (ctx?.brand.whiteLabel) {
    const supabase = createSupabaseServerClient();
    const [logoDarkUrl, logoLightUrl] = await Promise.all([
      signedUrl(supabase, ctx.brand.logoDarkPath, 3600),
      signedUrl(supabase, ctx.brand.logoLightPath, 3600),
    ]);
    brand = {
      name: ctx.brand.name || "Studio",
      logoLightUrl,
      logoDarkUrl,
    };
  }

  return (
    <AppShell brand={brand} areaLabel={market}>
      {children}
    </AppShell>
  );
}
