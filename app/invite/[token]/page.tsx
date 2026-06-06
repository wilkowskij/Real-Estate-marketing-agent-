import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import {
  InviteAcceptClient,
  InviteErrorCard,
  type InviteDetails,
} from "@/components/invite/InviteAcceptClient";

export const dynamic = "force-dynamic";

/**
 * Branded invitation acceptance page.
 *
 * For agents arriving via the Supabase invite email:
 *   /auth/callback sets the session first, then redirects here → they
 *   see the Accept button.
 *
 * For agents who open the link while logged out (shared URL, expired
 * browser session, etc.):
 *   They see the branded card with a "Sign in to accept" link pointing
 *   back here after login.
 */
export default async function InviteAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createSupabaseAdminClient();
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the invitation — use admin client so unauthenticated visitors can
  // still see the branded page even before they log in.
  const { data: invite, error: fetchErr } = await admin
    .from("org_invitations")
    .select("id, org_id, email, role, expires_at, accepted_at")
    .eq("token", params.token)
    .maybeSingle();

  if (fetchErr || !invite) {
    return (
      <InviteErrorCard message="This invitation link is invalid or has already been used." />
    );
  }

  if (invite.accepted_at) {
    return <InviteErrorCard message="This invitation has already been accepted." />;
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <InviteErrorCard message="This invitation has expired. Ask your admin to send a new one." />
    );
  }

  // Load org branding.
  const { data: org } = await admin
    .from("orgs")
    .select("name")
    .eq("id", invite.org_id)
    .single();

  const { data: kits } = await admin
    .from("brand_kits")
    .select("logo_light_path, logo_dark_path")
    .eq("org_id", invite.org_id)
    .eq("owner", "org")
    .limit(1);

  const kit = kits?.[0];
  const logoPath = kit?.logo_dark_path ?? kit?.logo_light_path ?? null;

  // Create a short-lived signed URL for the logo (admin client bypasses RLS).
  const logoUrl = logoPath ? await signedUrl(admin, logoPath, 3600) : null;

  const inviteDetails: InviteDetails = {
    orgName: org?.name ?? "your company",
    logoUrl,
    role: invite.role,
    email: invite.email,
    expiresAt: invite.expires_at,
  };

  const loginNext = `/login?next=/invite/${params.token}`;

  // If the authenticated user's email doesn't match the invite, show a
  // specific error rather than a confusing "accept" button.
  if (user && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteErrorCard message="This invitation was sent to a different email address. Please sign in with the invited account." />
    );
  }

  return (
    <InviteAcceptClient
      token={params.token}
      invite={inviteDetails}
      isAuthenticated={!!user}
      loginNext={loginNext}
    />
  );
}
