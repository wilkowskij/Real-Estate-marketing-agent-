/**
 * Per-platform OAuth config + token exchange. One central app per platform
 * (Buffer-style): customers click "Connect", authorize, and we store their
 * token — they never see app credentials.
 *
 * NOTE: live posting requires the platform's app review + business verification
 * (weeks). These flows are ready so connecting an account works the moment the
 * app is approved; until then publishing falls back to manual export.
 */

export type Platform = "instagram" | "facebook" | "linkedin" | "twitter";

export interface OAuthConfig {
  platform: Platform;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  /**
   * Twitter/X uses OAuth 2.0 with PKCE (a per-request code_verifier/challenge)
   * rather than the plain authorization-code flow Meta/LinkedIn use.
   */
  pkce?: boolean;
  /** Separator the platform expects between scopes in the authorize URL. */
  scopeSeparator: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  /** seconds until expiry, if provided */
  expiresIn?: number;
  meta?: Record<string, unknown>;
}

import { createHash, randomBytes } from "crypto";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a PKCE verifier + S256 challenge pair (Twitter/X OAuth 2.0). The
 * verifier is stashed in a short-lived cookie at connect time and replayed at
 * the callback to prove the same client completed the flow.
 */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function redirectUri(platform: Platform): string {
  return `${appUrl()}/api/social/callback/${platform}`;
}

/** Build the platform OAuth config from env. Throws if not configured. */
export function getOAuthConfig(platform: Platform): OAuthConfig {
  switch (platform) {
    case "instagram":
    case "facebook": {
      // Instagram publishing goes through the Facebook/Meta Graph API.
      const clientId = process.env.META_APP_ID ?? "";
      const clientSecret = process.env.META_APP_SECRET ?? "";
      const scopes =
        platform === "instagram"
          ? ["instagram_basic", "instagram_content_publish", "pages_show_list", "business_management"]
          : ["pages_show_list", "pages_manage_posts", "pages_read_engagement"];
      // META_GRAPH_API_URL lets tests point token exchange at a local mock server.
      const graphBase = process.env.META_GRAPH_API_URL ?? "https://graph.facebook.com/v21.0";
      return {
        platform,
        authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: `${graphBase}/oauth/access_token`,
        scopes,
        clientId,
        clientSecret,
        scopeSeparator: ",",
      };
    }
    case "linkedin": {
      return {
        platform,
        authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        scopes: ["openid", "profile", "w_member_social"],
        clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        scopeSeparator: " ",
      };
    }
    case "twitter": {
      // X / Twitter API v2 — OAuth 2.0 Authorization Code with PKCE.
      // offline.access yields a refresh token so the connection survives expiry.
      return {
        platform,
        authorizeUrl: "https://twitter.com/i/oauth2/authorize",
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
        clientId: process.env.TWITTER_CLIENT_ID ?? "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
        pkce: true,
        scopeSeparator: " ",
      };
    }
  }
}

export function isConfigured(platform: Platform): boolean {
  const c = getOAuthConfig(platform);
  return Boolean(c.clientId && c.clientSecret);
}

/**
 * Build the authorize URL the user is redirected to, carrying a CSRF state.
 * For PKCE platforms (Twitter/X) pass the S256 `codeChallenge`.
 */
export function buildAuthorizeUrl(
  platform: Platform,
  state: string,
  codeChallenge?: string
): string {
  const c = getOAuthConfig(platform);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: redirectUri(platform),
    scope: c.scopes.join(c.scopeSeparator),
    state,
  });
  if (c.pkce) {
    params.set("code_challenge", codeChallenge ?? "");
    params.set("code_challenge_method", "S256");
  }
  return `${c.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token. PKCE platforms must pass
 * the `codeVerifier` that matches the challenge sent at authorize time.
 */
export async function exchangeCode(
  platform: Platform,
  code: string,
  opts: { codeVerifier?: string } = {}
): Promise<TokenResponse> {
  const c = getOAuthConfig(platform);

  if (platform === "twitter") {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(platform),
      client_id: c.clientId,
      code_verifier: opts.codeVerifier ?? "",
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    // Confidential clients authenticate with HTTP Basic; public clients omit it.
    if (c.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`;
    }
    const res = await fetch(c.tokenUrl, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`Twitter token exchange failed: ${await res.text()}`);
    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
    };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(platform),
    client_id: c.clientId,
    client_secret: c.clientSecret,
  });

  if (platform === "linkedin") {
    const res = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
    const json = await res.json();
    return { accessToken: json.access_token, expiresIn: json.expires_in };
  }

  // Meta accepts the params as a GET query on the token endpoint.
  const res = await fetch(`${c.tokenUrl}?${body.toString()}`);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

/**
 * Refresh / extend an access token before it expires.
 * - Meta has no refresh token; instead the long-lived token is re-exchanged via
 *   the fb_exchange_token grant, which returns a fresh long-lived token.
 * - LinkedIn uses the refresh_token grant (only if a refresh token was issued —
 *   which requires the appropriate API program). Without one, returns null and
 *   the account must be reconnected.
 */
export async function refreshAccessToken(
  platform: Platform,
  current: { accessToken?: string; refreshToken?: string }
): Promise<TokenResponse | null> {
  const c = getOAuthConfig(platform);

  if (platform === "twitter") {
    if (!current.refreshToken) return null;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
      client_id: c.clientId,
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (c.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`;
    }
    const res = await fetch(c.tokenUrl, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`Twitter token refresh failed: ${await res.text()}`);
    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? current.refreshToken,
      expiresIn: json.expires_in,
    };
  }

  if (platform === "linkedin") {
    if (!current.refreshToken) return null;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
      client_id: c.clientId,
      client_secret: c.clientSecret,
    });
    const res = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${await res.text()}`);
    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? current.refreshToken,
      expiresIn: json.expires_in,
    };
  }

  // Meta: extend the long-lived token.
  if (!current.accessToken) return null;
  const graphBase = process.env.META_GRAPH_API_URL ?? "https://graph.facebook.com/v21.0";
  const body = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: c.clientId,
    client_secret: c.clientSecret,
    fb_exchange_token: current.accessToken,
  });
  const res = await fetch(`${graphBase}/oauth/access_token?${body.toString()}`);
  if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}
