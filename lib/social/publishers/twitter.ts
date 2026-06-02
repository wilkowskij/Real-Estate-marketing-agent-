import type { PublishInput, PublishResult, SocialPublisher, PlatformAuth } from "../publisher";

const API = "https://api.twitter.com/2";
const UPLOAD = "https://upload.twitter.com/1.1/media/upload.json";

/**
 * X / Twitter post via API v2. Text tweets go to POST /2/tweets; an image is
 * first uploaded (v1.1 media/upload, which OAuth 2.0 user tokens may call) to
 * obtain a media_id that the tweet references. If the image upload fails we
 * still post the text so the listing copy goes out rather than nothing.
 */
export class TwitterPublisher implements SocialPublisher {
  readonly platform = "twitter";
  readonly live = true;

  async publish(input: PublishInput, auth: PlatformAuth): Promise<PublishResult> {
    const token = auth.accessToken;
    if (!token) return { ok: false, error: "X account not connected (missing token)." };

    try {
      const mediaId = input.mediaUrls[0]
        ? await this.uploadImage(input.mediaUrls[0], token)
        : null;

      const body: Record<string, unknown> = { text: input.caption };
      if (mediaId) body.media = { media_ids: [mediaId] };

      const res = await fetch(`${API}/tweets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: `X publish failed: ${JSON.stringify(json)}` };
      return { ok: true, platformPostId: json.data?.id };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Upload an image and return its media_id, or null on failure (text-only). */
  private async uploadImage(imageUrl: string, token: string): Promise<string | null> {
    try {
      const bytes = await (await fetch(imageUrl)).arrayBuffer();
      const form = new FormData();
      form.append("media", new Blob([bytes]), "image.png");
      const res = await fetch(UPLOAD, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.media_id_string as string) ?? null;
    } catch {
      return null;
    }
  }
}
