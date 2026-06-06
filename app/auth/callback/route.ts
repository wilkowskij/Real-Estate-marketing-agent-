import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Universal Supabase auth callback handler.
 * Used by the agent invitation flow: the invite email links here so Supabase
 * can exchange the OTP/code for a session, then we forward to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "invite"
    | "signup"
    | "recovery"
    | "email"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = createSupabaseServerClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type });
  }

  return NextResponse.redirect(new URL(next, origin));
}
