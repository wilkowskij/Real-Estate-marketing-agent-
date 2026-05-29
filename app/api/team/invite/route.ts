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
 * "Invite" an agent to the org by email. There is no email/token system: we add
 * an existing auth user to the org. The invitee must already have signed up.
 * Admin-only. Uses the service-role client to look the user up in auth.users by
 * email, then inserts their membership.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Only org admins can invite agents." },
      { status: 403 }
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, role } = parsed.data;
  const target = email.trim().toLowerCase();

  // Find the matching auth user by email. Service role bypasses RLS.
  const admin = createSupabaseAdminClient();
  let userId: string | null = null;
  // listUsers is paginated; scan pages until we find the email or run out.
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) userId = match.id;
    if (data.users.length < 200) break; // last page
  }

  if (!userId) {
    return NextResponse.json(
      { error: "No account found for that email. Ask them to sign up first, then invite again." },
      { status: 404 }
    );
  }

  // Reject if they're already a member of this org.
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

  // Insert the membership through the RLS client so admin-write is enforced.
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("memberships")
    .insert({ org_id: ctx.orgId, user_id: userId, role });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
