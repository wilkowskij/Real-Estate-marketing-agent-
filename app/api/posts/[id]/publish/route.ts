import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishPost } from "@/lib/social/publish";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publish a single post now. RLS ensures the user can only touch their org's
 * posts. Used by the "Publish" button; the cron worker calls publishPost()
 * directly with a service-role client for scheduled posts.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional override to publish past the Fair-Housing review gate (admin acted
  // on the flagged notes). Body is optional.
  const body = await req.json().catch(() => ({}));
  const overrideCompliance = body?.overrideCompliance === true;

  // Only an org admin/owner may override the Fair-Housing gate. A non-admin
  // requesting an override is rejected outright, not silently downgraded to
  // false — same role check as the other admin-gated routes in this app
  // (app/api/team/locks, app/api/team/members/[id], app/api/billing/checkout,
  // app/api/billing/portal).
  if (overrideCompliance && ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Only org admins can override the Fair-Housing compliance gate." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseServerClient();
  const result = await publishPost(supabase, params.id, { overrideCompliance });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
