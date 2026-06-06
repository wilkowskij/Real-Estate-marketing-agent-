import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Accept an invitation. The agent must be authenticated (Supabase set their
 * session via /auth/callback before they landed on /invite/[token]).
 *
 * Idempotent: if they're already a member of the org, we just mark the
 * invitation accepted and return success.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: invite, error: fetchErr } = await admin
    .from("org_invitations")
    .select("id, org_id, email, role, expires_at, accepted_at")
    .eq("token", params.token)
    .maybeSingle();

  if (fetchErr || !invite) {
    return NextResponse.json(
      { error: "Invitation not found or already used." },
      { status: 404 }
    );
  }

  if (invite.accepted_at) {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address." },
      { status: 403 }
    );
  }

  // Check if already a member (idempotent).
  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberErr } = await admin
      .from("memberships")
      .insert({ org_id: invite.org_id, user_id: user.id, role: invite.role });

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }
  }

  await admin
    .from("org_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
