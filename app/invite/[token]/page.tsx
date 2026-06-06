import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Agent lands here after clicking the invite email. By the time they reach
 * this page, Supabase has already exchanged the invite token and set a session
 * cookie (via /auth/callback). We validate the invitation record, create the
 * membership, then redirect to the dashboard.
 */
export default async function InviteAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();

  // Load the invitation (service-role so we can read without being in the org yet).
  const { data: invite, error: fetchErr } = await admin
    .from("org_invitations")
    .select("id, org_id, email, role, expires_at, accepted_at")
    .eq("token", params.token)
    .maybeSingle();

  if (fetchErr || !invite) {
    return <InviteError message="This invitation link is invalid or has already been used." />;
  }

  if (invite.accepted_at) {
    return <InviteError message="This invitation has already been accepted." />;
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <InviteError message="This invitation has expired. Ask your admin to send a new one." />;
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteError message="This invitation was sent to a different email address. Please sign in with the invited email." />
    );
  }

  // Check not already a member.
  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    // Create membership (service-role bypasses RLS — we've already verified the token).
    const { error: memberErr } = await admin
      .from("memberships")
      .insert({ org_id: invite.org_id, user_id: user.id, role: invite.role });

    if (memberErr) {
      return <InviteError message="Failed to join the company. Please try again or contact support." />;
    }
  }

  // Mark invitation as accepted.
  await admin
    .from("org_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect("/dashboard");
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-paper-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-navy">Invitation Error</h1>
        <p className="mt-3 text-sm text-ink-muted">{message}</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white"
        >
          Go to sign in
        </a>
      </div>
    </div>
  );
}
