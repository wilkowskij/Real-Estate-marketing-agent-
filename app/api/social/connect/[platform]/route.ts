import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getOrgContext } from "@/lib/org";
import { buildAuthorizeUrl, isConfigured, type Platform } from "@/lib/social/oauth";

export const runtime = "nodejs";

const PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin"];

/**
 * Start the OAuth connect flow. Stores a CSRF `state` (tied to the org) in a
 * short-lived httpOnly cookie, then redirects the user to the platform's
 * authorize page. The callback verifies state before exchanging the code.
 */
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", req.url));
  // Only org owners/admins manage connected accounts (matches social_accounts RLS).
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can connect accounts." }, { status: 403 });
  }

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
  const res = NextResponse.redirect(buildAuthorizeUrl(platform, state));
  res.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
