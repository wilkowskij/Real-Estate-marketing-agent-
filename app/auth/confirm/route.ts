import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Email confirmation landing. Supabase can deliver the confirmation link in two
 * shapes depending on which email template is configured, and we handle both so
 * verification works either way:
 *
 *   1. PKCE / default template — the link returns here with `?code=...` (the
 *      `@supabase/ssr` browser client uses PKCE, so the default
 *      `{{ .ConfirmationURL }}` lands back on `emailRedirectTo` with a code).
 *      We exchange the code for a session.
 *   2. Branded OTP template — the link carries `?token_hash=...&type=signup`
 *      (set in Supabase → Auth → Email Templates → Confirm signup):
 *        {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
 *      We verify the OTP.
 *
 * Either path sets the session cookie and lands the now-verified user in the
 * app. On failure we bounce to login with a flag so the UI can explain.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/dashboard";
  // Only allow same-origin relative redirects.
  const dest = next.startsWith("/") ? next : "/dashboard";

  const supabase = createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(dest, origin));
  }

  return NextResponse.redirect(new URL("/login?verify=failed", origin));
}
