import type { PublishInput, PublishResult, SocialPublisher, PlatformAuth } from "../publisher";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Instagram publishing via the Graph API is a two-step flow:
 *   1) create a media container from the image URL + caption
 *   2) publish the container to the IG Business account
 * auth.meta must carry the connected `igUserId`.
 */
export class InstagramPublisher implements SocialPublisher {
  readonly platform = "instagram";
  readonly live = true;

  async publish(input: PublishInput, auth: PlatformAuth): Promise<PublishResult> {
    const igUserId = auth.meta?.igUserId as string | undefined;
    // IG/FB Graph endpoints are page-scoped and need the PAGE access token
    // (stored in meta at connect time), not the user token. Fall back to the
    // user token only if a page token wasn't captured.
    const token = (auth.meta?.pageAccessToken as string | undefined) ?? auth.accessToken;
    if (!igUserId || !token) {
      return { ok: false, error: "Instagram account not fully connected (missing igUserId/token)." };
    }
    const imageUrl = input.mediaUrls[0];
    if (!imageUrl) return { ok: false, error: "No media to publish." };

    try {
      const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, caption: input.caption, access_token: token }),
      });
      const created = await createRes.json();
      if (!createRes.ok) return { ok: false, error: `IG container failed: ${JSON.stringify(created)}` };

      const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: created.id, access_token: token }),
      });
      const published = await pubRes.json();
      if (!pubRes.ok) return { ok: false, error: `IG publish failed: ${JSON.stringify(published)}` };
      return { ok: true, platformPostId: published.id };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}

/** Facebook Page photo post. auth.meta must carry the `pageId` + page token. */
export class FacebookPublisher implements SocialPublisher {
  readonly platform = "facebook";
  readonly live = true;

  async publish(input: PublishInput, auth: PlatformAuth): Promise<PublishResult> {
    const pageId = auth.meta?.pageId as string | undefined;
    // Page-scoped endpoint → prefer the page access token captured at connect.
    const token = (auth.meta?.pageAccessToken as string | undefined) ?? auth.accessToken;
    if (!pageId || !token) {
      return { ok: false, error: "Facebook Page not fully connected (missing pageId/token)." };
    }
    const imageUrl = input.mediaUrls[0];
    try {
      const endpoint = imageUrl ? `${GRAPH}/${pageId}/photos` : `${GRAPH}/${pageId}/feed`;
      const payload: Record<string, string> = imageUrl
        ? { url: imageUrl, caption: input.caption, access_token: token }
        : { message: input.caption, access_token: token };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: `FB publish failed: ${JSON.stringify(json)}` };
      return { ok: true, platformPostId: json.post_id ?? json.id };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}
