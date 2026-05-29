import type { PublishInput, PublishResult, SocialPublisher, PlatformAuth } from "../publisher";

const API = "https://api.linkedin.com/v2";

/**
 * LinkedIn member share. auth.meta must carry the connected member's `personUrn`
 * (e.g. "urn:li:person:abc"). Image upload uses the assets/registerUpload flow;
 * for simplicity we post a text+article share when no image is provided, and
 * register+upload the image otherwise.
 */
export class LinkedInPublisher implements SocialPublisher {
  readonly platform = "linkedin";
  readonly live = true;

  async publish(input: PublishInput, auth: PlatformAuth): Promise<PublishResult> {
    const author = auth.meta?.personUrn as string | undefined;
    const token = auth.accessToken;
    if (!author || !token) {
      return { ok: false, error: "LinkedIn account not fully connected (missing personUrn/token)." };
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    };

    try {
      let media: unknown[] = [];
      let shareMediaCategory = "NONE";
      const imageUrl = input.mediaUrls[0];

      if (imageUrl) {
        const asset = await this.uploadImage(imageUrl, author, token);
        if (!asset.ok) return { ok: false, error: asset.error };
        media = [{ status: "READY", media: asset.urn }];
        shareMediaCategory = "IMAGE";
      }

      const res = await fetch(`${API}/ugcPosts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: input.caption },
              shareMediaCategory,
              media,
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: `LinkedIn publish failed: ${JSON.stringify(json)}` };
      return { ok: true, platformPostId: json.id };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  private async uploadImage(
    imageUrl: string,
    owner: string,
    token: string
  ): Promise<{ ok: true; urn: string } | { ok: false; error: string }> {
    const reg = await fetch(`${API}/assets?action=registerUpload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner,
          serviceRelationships: [
            { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
          ],
        },
      }),
    });
    const regJson = await reg.json();
    if (!reg.ok) return { ok: false, error: `LinkedIn registerUpload failed: ${JSON.stringify(regJson)}` };

    const uploadUrl =
      regJson.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const assetUrn = regJson.value.asset as string;

    const bytes = await (await fetch(imageUrl)).arrayBuffer();
    const put = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: Buffer.from(bytes),
    });
    if (!put.ok) return { ok: false, error: `LinkedIn image upload failed: ${put.status}` };
    return { ok: true, urn: assetUrn };
  }
}
