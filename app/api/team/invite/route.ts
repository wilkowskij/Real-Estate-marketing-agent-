import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]),
});

/**
 * Invite an agent to the org by email.
 *
 * - If the email already has an account: add the membership immediately.
 * - If there's no account yet: create an org_invitations record and send a
 *   Supabase invite email. The agent signs up via the emailed link and is
 *   redirected to /invite/[token] where the membership is created.
 *
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can invite agents." }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, role } = parsed.data;
  const target = email.trim().toLowerCase();

  const admin = createSupabaseAdminClient();

  // Check if a user with that email already exists.
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) userId = match.id;
    if (data.users.length < 200) break;
  }

  // ── Existing user path ────────────────────────────────────────────────────
  if (userId) {
    const { data: existing } = await admin
      .from("memberships")
      .select("id")
      .eq("org_id", ctx.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "That person is already a member of this org." },
        { status: 409 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("memberships")
      .insert({ org_id: ctx.orgId, user_id: userId, role });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, type: "added" });
  }

  // ── New user path — send invite email ────────────────────────────────────
  // Check for an existing pending invite to avoid duplicates.
  const { data: existingInvite } = await admin
    .from("org_invitations")
    .select("id")
    .eq("org_id", ctx.orgId)
    .eq("email", target)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json(
      { error: "An active invitation has already been sent to that email." },
      { status: 409 }
    );
  }

  // Insert the invitation record; the DB generates the token.
  const supabase = createSupabaseServerClient();
  const { data: invitation, error: invErr } = await supabase
    .from("org_invitations")
    .insert({ org_id: ctx.orgId, email: target, role, invited_by: ctx.userId })
    .select("token")
    .single();

  if (invErr || !invitation) {
    return NextResponse.json(
      { error: invErr?.message ?? "Failed to create invitation." },
      { status: 500 }
    );
  }

  // Send the Supabase invite email. The magic link redirects through our
  // /auth/callback route which then forwards to /invite/[token] so the agent
  // is authenticated before we create their membership.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectTo = `${appUrl}/auth/callback?next=/invite/${invitation.token}`;

  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(target, {
    redirectTo,
  });

  if (emailErr) {
    // Roll back the invitation row so the admin can retry.
    await supabase
      .from("org_invitations")
      .delete()
      .eq("token", invitation.token);
    return NextResponse.json({ error: emailErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, type: "invited" });
}
