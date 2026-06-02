import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exchangeCode, type Platform } from "@/lib/social/oauth";
import { encryptToken } from "@/lib/social/crypto";

export const runtime = "nodejs";

const PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin", "twitter"];

/**
 * OAuth callback: verify CSRF state, exchange the code for a token, resolve the
 * platform account identifier(s) the publishers need, then persist an encrypted
 * social_accounts row owned by the connecting member (per-person). Redirects
 * back to the Connections settings page.
 */
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform as Platform;
  const settings = new URL("/profile/connections", req.url);

  if (!PLATFORMS.includes(platform)) {
    settings.searchParams.set("error", "unknown_platform");
    return NextResponse.redirect(settings);
  }

  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(`oauth_state_${platform}`)?.value;
  const codeVerifier = req.cookies.get(`oauth_verifier_${platform}`)?.value;

  if (!code || !state || state !== cookieState || !state.startsWith(`${ctx.orgId}.`)) {
    settings.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settings);
  }

  try {
    const token = await exchangeCode(platform, code, { codeVerifier });
    const { label, meta } = await resolveAccount(platform, token.accessToken);

    const supabase = createSupabaseServerClient();
    // Per-person connection: replace any prior account this member linked for
    // the platform so reconnecting refreshes the token rather than duplicating.
    await supabase
      .from("social_accounts")
      .delete()
      .eq("org_id", ctx.orgId)
      .eq("membership_id", ctx.membershipId)
      .eq("platform", platform);

    await supabase.from("social_accounts").insert({
      org_id: ctx.orgId,
      owner: "member",
      membership_id: ctx.membershipId,
      platform,
      account_label: label,
      access_token_enc: encryptToken(token.accessToken),
      refresh_token_enc: token.refreshToken ? encryptToken(token.refreshToken) : null,
      expires_at: token.expiresIn
        ? new Date(Date.now() + token.expiresIn * 1000).toISOString()
        : null,
      meta,
    });

    settings.searchParams.set("connected", platform);
    const res = NextResponse.redirect(settings);
    res.cookies.delete(`oauth_state_${platform}`);
    res.cookies.delete(`oauth_verifier_${platform}`);
    return res;
  } catch (e: any) {
    settings.searchParams.set("error", encodeURIComponent(e.message ?? "exchange_failed"));
    return NextResponse.redirect(settings);
  }
}

/**
 * Resolve the platform-specific identifiers the publishers expect:
 * - facebook → first managed Page + its page token (pageId, page access token)
 * - instagram → the IG Business account linked to that Page (igUserId)
 * - linkedin → the member URN (personUrn)
 * - twitter → the authenticated user id + handle
 */
async function resolveAccount(
  platform: Platform,
  accessToken: string
): Promise<{ label: string; meta: Record<string, unknown> }> {
  if (platform === "twitter") {
    const res = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    const me = json?.data;
    return {
      label: me?.username ? `@${me.username}` : "X account",
      meta: { userId: me?.id, username: me?.username },
    };
  }

  if (platform === "linkedin") {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = await res.json();
    return { label: me.name ?? "LinkedIn", meta: { personUrn: `urn:li:person:${me.sub}` } };
  }

  // Meta: list Pages the user manages; pick the first.
  const GRAPH = "https://graph.facebook.com/v21.0";
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
  );
  const pages = await pagesRes.json();
  const page = pages.data?.[0];
  if (!page) return { label: "No Page found", meta: {} };

  if (platform === "facebook") {
    return { label: page.name, meta: { pageId: page.id, pageAccessToken: page.access_token } };
  }
  // instagram
  const igId = page.instagram_business_account?.id;
  return {
    label: `${page.name} (IG)`,
    meta: { igUserId: igId, pageId: page.id, pageAccessToken: page.access_token },
  };
}
