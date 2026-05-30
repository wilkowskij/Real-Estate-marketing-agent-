import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const PatchBody = z.object({
  role: z.enum(["member", "admin"]),
});

/**
 * Load the target membership (scoped to the caller's org) and run the shared
 * admin/self/owner guards. Returns the membership row or a NextResponse error.
 */
async function loadTarget(membershipId: string) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Only org admins can manage members." }, { status: 403 }),
    };
  }

  const supabase = createSupabaseServerClient();
  const { data: target } = await supabase
    .from("memberships")
    .select("id, role, user_id, org_id")
    .eq("id", membershipId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!target) {
    return { error: NextResponse.json({ error: "Member not found." }, { status: 404 }) };
  }
  if (target.user_id === ctx.userId) {
    return {
      error: NextResponse.json({ error: "You cannot change your own membership." }, { status: 400 }),
    };
  }
  if (target.role === "owner") {
    return {
      error: NextResponse.json({ error: "The org owner cannot be changed or removed." }, { status: 400 }),
    };
  }

  return { ctx, supabase, target };
}

/** Change a member's role (member <-> admin). Owners and self are protected. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await loadTarget(params.id);
  if (loaded.error) return loaded.error;

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await loaded.supabase
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("id", params.id)
    .eq("org_id", loaded.ctx.orgId); // defense-in-depth: never touch another org's row
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Remove a member from the org. Owners and self are protected. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await loadTarget(params.id);
  if (loaded.error) return loaded.error;

  const { error } = await loaded.supabase
    .from("memberships")
    .delete()
    .eq("id", params.id)
    .eq("org_id", loaded.ctx.orgId); // defense-in-depth
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
