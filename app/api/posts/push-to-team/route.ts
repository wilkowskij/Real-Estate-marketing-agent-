import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

/**
 * POST /api/posts/push-to-team
 * Body: { postId: string }
 *
 * Marks a post as a brokerage push (is_brokerage_push = true). The post
 * then appears with a "From brokerage" badge in every team member's queue.
 * Only org admins and owners may call this endpoint.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.role !== "admin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { postId } = (await req.json()) as { postId?: string };
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const supabase = createSupabaseServerClient();

  // Verify the post belongs to this org before marking it
  const { data: post, error: fetchErr } = await supabase
    .from("posts")
    .select("id, is_brokerage_push")
    .eq("id", postId)
    .eq("org_id", ctx.orgId)
    .single();

  if (fetchErr || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("posts")
    .update({ is_brokerage_push: true })
    .eq("id", postId)
    .eq("org_id", ctx.orgId)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, pushed: true });
}
