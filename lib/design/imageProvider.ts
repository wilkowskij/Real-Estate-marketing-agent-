/**
 * Pluggable AI image provider. The Design Agent writes the prompts; the chosen
 * provider does the pixels. Swap implementations via IMAGE_PROVIDER env var
 * without touching callers.
 */
export interface ImageProvider {
  /** Enhance an existing photo (sky cleanup, exposure, virtual staging). */
  enhance(input: { imageUrl: string; prompt: string }): Promise<{ bytes: ArrayBuffer; contentType: string }>;
  /** Generate a brand-new image from a text prompt. */
  generate(input: { prompt: string; width: number; height: number }): Promise<{ bytes: ArrayBuffer; contentType: string }>;
}

/** No-op provider for local dev / when no provider is configured. */
class StubImageProvider implements ImageProvider {
  async enhance(): Promise<{ bytes: ArrayBuffer; contentType: string }> {
    throw new Error(
      "Image provider is set to 'stub'. Set IMAGE_PROVIDER and IMAGE_PROVIDER_API_KEY to enable AI imagery."
    );
  }
  async generate(): Promise<{ bytes: ArrayBuffer; contentType: string }> {
    throw new Error(
      "Image provider is set to 'stub'. Set IMAGE_PROVIDER and IMAGE_PROVIDER_API_KEY to enable AI imagery."
    );
  }
}

/**
 * OpenAI image provider (gpt-image-1) via the REST API — no SDK dependency.
 * - generate → POST /v1/images/generations
 * - enhance  → POST /v1/images/edits (multipart; fetches the source photo first)
 * Both return base64 PNG, which we decode to bytes for Storage.
 */
class OpenAIImageProvider implements ImageProvider {
  private readonly key = process.env.OPENAI_API_KEY ?? process.env.IMAGE_PROVIDER_API_KEY ?? "";
  private readonly model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  private readonly base = "https://api.openai.com/v1";

  private assertKey() {
    if (!this.key) {
      throw new Error("IMAGE_PROVIDER=openai requires OPENAI_API_KEY (or IMAGE_PROVIDER_API_KEY).");
    }
  }

  /** Snap arbitrary dimensions to the closest size gpt-image-1 supports. */
  private size(width: number, height: number): string {
    if (width === height) return "1024x1024";
    return width > height ? "1536x1024" : "1024x1536";
  }

  private decode(b64: string): { bytes: ArrayBuffer; contentType: string } {
    const buf = Buffer.from(b64, "base64");
    return {
      bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      contentType: "image/png",
    };
  }

  async generate(input: { prompt: string; width: number; height: number }) {
    this.assertKey();
    const res = await fetch(`${this.base}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: input.prompt,
        size: this.size(input.width, input.height),
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI image generate failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    return this.decode(json.data[0].b64_json);
  }

  async enhance(input: { imageUrl: string; prompt: string }) {
    this.assertKey();
    const src = await fetch(input.imageUrl);
    if (!src.ok) throw new Error(`Could not fetch source image: ${src.status}`);
    const srcBlob = await src.blob();

    const form = new FormData();
    form.append("model", this.model);
    form.append("prompt", input.prompt);
    form.append("image", srcBlob, "source.png");

    const res = await fetch(`${this.base}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}` }, // fetch sets multipart boundary
      body: form,
    });
    if (!res.ok) throw new Error(`OpenAI image edit failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    return this.decode(json.data[0].b64_json);
  }
}

let cached: ImageProvider | undefined;

export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  const which = process.env.IMAGE_PROVIDER ?? "stub";
  switch (which) {
    case "openai":
      cached = new OpenAIImageProvider();
      break;
    default:
      cached = new StubImageProvider();
  }
  return cached;
}
