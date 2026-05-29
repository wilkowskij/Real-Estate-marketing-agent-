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

let cached: ImageProvider | undefined;

export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  const which = process.env.IMAGE_PROVIDER ?? "stub";
  switch (which) {
    // Add real providers here, e.g. case "gemini": cached = new GeminiProvider();
    default:
      cached = new StubImageProvider();
  }
  return cached;
}
