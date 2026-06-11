import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { InviteClient } from "./InviteClient";

export const dynamic = "force-dynamic";

/**
 * White-labeled invite landing page. Resolves the org's branding from the token
 * so the agent sees "[Brokerage Name] invited you" — not "Marquee invited you."
 * The InviteClient handles auth state and the join action client-side.
 */
export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createSupabaseAdminClient();

  // Resolve token → org brand (no auth required — token is the credential).
  const { data: invite } = await admin
    .from("org_invite_tokens")
    .select("org_id, role")
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) notFound();

  // Load org display name and brand kit for white-labeling.
  const [{ data: org }, { data: kits }] = await Promise.all([
    admin.from("orgs").select("name, plan").eq("id", invite.org_id).single(),
    admin.from("brand_kits").select("owner, logo_light_path, colors").eq("org_id", invite.org_id),
  ]);

  const orgKit = (kits ?? []).find((k: any) => k.owner === "org" && k.is_default) ?? (kits ?? [])[0];
  const logoUrl = orgKit?.logo_light_path
    ? await signedUrl(admin as any, orgKit.logo_light_path, 3600)
    : null;

  // Primary brand color for the invite page accent.
  const brandColor: string =
    (orgKit?.colors as any)?.primary ?? "#C9A96E";

  return (
    <InviteClient
      token={params.token}
      orgName={(org as any)?.name ?? "Your brokerage"}
      logoUrl={logoUrl}
      brandColor={brandColor}
      role={invite.role as "member" | "admin"}
    />
  );
}
