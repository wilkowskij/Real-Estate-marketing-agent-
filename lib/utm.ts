/**
 * UTM link injection — appends tracking parameters to any URL found in
 * generated post copy. These parameters feed the Phase 4 attribution engine.
 *
 * Only operates on http/https URLs; relative paths and non-URL strings are
 * returned unchanged. Safe to call on any text — non-URL strings pass through.
 */

const URL_RE = /https?:\/\/[^\s"'<>)]+/g;

export function injectUtm(
  text: string,
  params: {
    source: string; // e.g. "instagram"
    medium?: string; // default "social"
    campaignId?: string;
    postId?: string;
  }
): string {
  return text.replace(URL_RE, (rawUrl) => {
    try {
      const url = new URL(rawUrl);
      url.searchParams.set("utm_source", params.source);
      url.searchParams.set("utm_medium", params.medium ?? "social");
      if (params.campaignId) url.searchParams.set("utm_campaign", params.campaignId);
      if (params.postId) url.searchParams.set("utm_content", params.postId);
      return url.toString();
    } catch {
      return rawUrl;
    }
  });
}

/** Apply UTM params to all URLs across the full copy package text fields. */
export function injectUtmIntoCopy<T extends { caption?: string; cta?: string; body?: string; message?: string }>(
  copy: T,
  params: Parameters<typeof injectUtm>[1]
): T {
  return {
    ...copy,
    ...(copy.caption !== undefined && { caption: injectUtm(copy.caption, params) }),
    ...(copy.cta !== undefined && { cta: injectUtm(copy.cta, params) }),
    ...(copy.body !== undefined && { body: injectUtm(copy.body, params) }),
    ...(copy.message !== undefined && { message: injectUtm(copy.message, params) }),
  };
}
