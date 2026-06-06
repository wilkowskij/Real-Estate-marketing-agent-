import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

/**
 * Re-send the Supabase invite email for a pending invitation.
 * Admin-only. Does not create a new invitation — just re-triggers the email
 * for the existing token.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();

  // Load the invitation, scoped to this admin's org.
  const { data: invite, error: fetchErr } = await supabase
    .from("org_invitations")
    .select("id, email, token, expires_at, accepted_at")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "This invitation has already been accepted." }, { status: 409 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired. Revoke it and create a new one." }, { status: 410 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectTo = `${appUrl}/auth/callback?next=/invite/${invite.token}`;

  const admin = createSupabaseAdminClient();
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo,
  });

  if (emailErr) {
    return NextResponse.json({ error: emailErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
