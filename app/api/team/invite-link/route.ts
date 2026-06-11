import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** GET — return the current invite link for this org (admin only). */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("org_invite_tokens")
    .select("token, role")
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!data) return NextResponse.json({ url: null });
  return NextResponse.json({ url: `${appUrl()}/invite/${data.token}`, role: data.role });
}

/**
 * POST — generate (or rotate) the invite link for this org. Upsert means
 * rotating is just a second POST — the old token is replaced atomically.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = body.role === "admin" ? "admin" : "member";

  // Generate a new token by deleting the old one and inserting fresh (ON CONFLICT
  // upsert would reuse the same token; we want a brand-new random value on rotate).
  const admin = createSupabaseAdminClient();
  await admin.from("org_invite_tokens").delete().eq("org_id", ctx.orgId);
  const { data, error } = await admin
    .from("org_invite_tokens")
    .insert({ org_id: ctx.orgId, role })
    .select("token")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not generate link." }, { status: 500 });
  return NextResponse.json({ url: `${appUrl()}/invite/${data.token}`, role });
}
