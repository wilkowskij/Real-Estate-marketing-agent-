import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PUBLIC tracked-link redirect. Atomically increments the click counter via a
 * SECURITY DEFINER function and 302s to the destination. No auth — this is the
 * URL embedded in a post/email CTA. Unknown slugs fall back to the app root.
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const home = process.env.NEXT_PUBLIC_APP_URL || "/";
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("increment_link_click", { link_slug: params.slug });
  const destination = typeof data === "string" ? data : null;

  if (error || !destination) {
    return NextResponse.redirect(home);
  }
  // Only allow http(s) destinations to avoid open-redirect to odd schemes.
  if (!/^https?:\/\//i.test(destination)) {
    return NextResponse.redirect(home);
  }
  return NextResponse.redirect(destination);
}
