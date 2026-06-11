import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

/**
 * POST { token } — claim an invite token and add the authenticated user to the
 * org as a member. Safe to call multiple times (idempotent via conflict check).
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  // Resolve the invite (service role bypasses RLS for the token lookup).
  const admin = createSupabaseAdminClient();
  const { data: invite } = await admin
    .from("org_invite_tokens")
    .select("org_id, role")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite link is invalid or has been revoked." }, { status: 404 });

  // Already a member of this org — nothing to do.
  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (existing) {
    // Already joined — redirect them to the dashboard normally.
    return NextResponse.json({ ok: true, orgId: invite.org_id, alreadyMember: true });
  }

  // Add the membership.
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("memberships")
    .insert({ org_id: invite.org_id, user_id: ctx.userId, role: invite.role });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, orgId: invite.org_id });
}
