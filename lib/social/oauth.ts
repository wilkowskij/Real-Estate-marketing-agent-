/**
 * Per-platform OAuth config + token exchange. One central app per platform
 * (Buffer-style): customers click "Connect", authorize, and we store their
 * token — they never see app credentials.
 *
 * NOTE: live posting requires the platform's app review + business verification
 * (weeks). These flows are ready so connecting an account works the moment the
 * app is approved; until then publishing falls back to manual export.
 */

export type Platform = "instagram" | "facebook" | "linkedin";

export interface OAuthConfig {
  platform: Platform;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  /** seconds until expiry, if provided */
  expiresIn?: number;
  meta?: Record<string, unknown>;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
      return {
        platform,
        authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes,
        clientId,
        clientSecret,
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
      };
    }
  }
}

export function isConfigured(platform: Platform): boolean {
  const c = getOAuthConfig(platform);
  return Boolean(c.clientId && c.clientSecret);
}

/** Build the authorize URL the user is redirected to, carrying a signed state. */
export function buildAuthorizeUrl(platform: Platform, state: string): string {
  const c = getOAuthConfig(platform);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: redirectUri(platform),
    scope: c.scopes.join(platform === "linkedin" ? " " : ","),
    state,
  });
  return `${c.authorizeUrl}?${params.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCode(platform: Platform, code: string): Promise<TokenResponse> {
  const c = getOAuthConfig(platform);
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
  const body = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: c.clientId,
    client_secret: c.clientSecret,
    fb_exchange_token: current.accessToken,
  });
  const res = await fetch(`${c.tokenUrl}?${body.toString()}`);
  if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}
