import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Email confirmation landing. The branded confirmation email links here with a
 * `token_hash` + `type`; we verify it (which sets the session cookie) and then
 * send the now-verified user back into the app. On failure we bounce to login
 * with a flag so the UI can explain.
 *
 * Email template link (set in Supabase → Auth → Email Templates → Confirm signup):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/dashboard";

  if (tokenHash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Only allow same-origin relative redirects.
      const dest = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(new URL(dest, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?verify=failed", origin));
}
