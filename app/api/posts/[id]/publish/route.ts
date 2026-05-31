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

  const supabase = createSupabaseServerClient();
  const result = await publishPost(supabase, params.id, { overrideCompliance });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
