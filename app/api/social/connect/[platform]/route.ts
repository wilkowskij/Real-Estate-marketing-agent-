import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getOrgContext } from "@/lib/org";
import { buildAuthorizeUrl, generatePkce, getOAuthConfig, isConfigured, type Platform } from "@/lib/social/oauth";

export const runtime = "nodejs";

const PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin", "twitter"];

/**
 * Start the OAuth connect flow. Connections are per-person: any signed-in member
 * can link their own account. Stores a CSRF `state` (tied to the org) in a
 * short-lived httpOnly cookie, then redirects to the platform's authorize page.
 * Twitter/X additionally requires a PKCE code_verifier, stored the same way and
 * replayed at the callback.
 */
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", req.url));

  const platform = params.platform as Platform;
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }
  if (!isConfigured(platform)) {
    return NextResponse.json(
      {
        error: `${platform} is not yet available — its OAuth app is pending approval/configuration. Posts use manual export until then.`,
      },
      { status: 503 }
    );
  }

  const state = `${ctx.orgId}.${randomBytes(16).toString("hex")}`;

  // PKCE platforms (Twitter/X) need a verifier created now and replayed later.
  let authorizeUrl: string;
  let verifier: string | null = null;
  if (getOAuthConfig(platform).pkce) {
    const pkce = generatePkce();
    verifier = pkce.verifier;
    authorizeUrl = buildAuthorizeUrl(platform, state, pkce.challenge);
  } else {
    authorizeUrl = buildAuthorizeUrl(platform, state);
  }

  const res = NextResponse.redirect(authorizeUrl);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set(`oauth_state_${platform}`, state, cookieOpts);
  if (verifier) res.cookies.set(`oauth_verifier_${platform}`, verifier, cookieOpts);
  return res;
}
