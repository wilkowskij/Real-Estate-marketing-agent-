import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publishPost } from "@/lib/social/publish";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publish-queue worker. Picks up posts that are scheduled (state='scheduled',
 * scheduled_at <= now) and dispatches each through the publisher. Authenticated
 * with the CRON_SECRET bearer token. Uses the service-role client so it can act
 * across orgs without a user session.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: due } = await supabase
    .from("posts")
    .select("id")
    .eq("state", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(25);

  const results = [];
  for (const post of due ?? []) {
    results.push({ id: post.id, ...(await publishPost(supabase, post.id)) });
  }

  return NextResponse.json({ processed: results.length, results });
}
