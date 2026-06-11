import { AppShell, type ShellBrand, type ShellSubscription } from "@/components/AppShell";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { areaLabel } from "@/lib/branding/marketArea";
import { aiCampaignsRemaining } from "@/lib/billing/subscription";

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
  const supabase = createSupabaseServerClient();

  let brand: ShellBrand | undefined;
  if (ctx?.brand.whiteLabel) {
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

  let shellSubscription: ShellSubscription | undefined;
  let creditsRemaining: number | null | undefined;
  if (ctx) {
    shellSubscription = {
      plan: ctx.subscription.plan,
      trialing: ctx.subscription.trialing,
      trialEndsAt: ctx.subscription.trialEndsAt,
      active: ctx.subscription.active,
    };
    creditsRemaining = await aiCampaignsRemaining(supabase, ctx.orgId, ctx.subscription);
  }

  return (
    <AppShell brand={brand} areaLabel={market} subscription={shellSubscription} creditsRemaining={creditsRemaining}>
      {children}
    </AppShell>
  );
}
