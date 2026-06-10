import type { Storyboard } from "@/lib/video/storyboard";

/**
 * Pluggable reel-render provider. The storyboard is built upstream (deterministic);
 * the provider turns it into an actual MP4. Selected via VIDEO_PROVIDER env, so
 * callers never change. With the default "stub" provider the app still works —
 * the storyboard is a ready-to-film shot list / manual export — exactly how
 * social publishing degrades to manual export before API approval.
 */
export interface VideoProvider {
  render(input: { storyboard: Storyboard }): Promise<{ url: string }>;
}

export function isVideoConfigured(): boolean {
  return (process.env.VIDEO_PROVIDER ?? "stub") !== "stub" && Boolean(process.env.SHOTSTACK_API_KEY);
}

/** No-op provider: rendering isn't enabled, so callers fall back to the shot list. */
class StubVideoProvider implements VideoProvider {
  async render(): Promise<{ url: string }> {
    throw new Error(
      "Video rendering is set to 'stub'. Set VIDEO_PROVIDER=shotstack and SHOTSTACK_API_KEY to render reels. " +
        "The storyboard is ready to film or export as a shot list in the meantime."
    );
  }
}

/**
 * Shotstack provider — assembles image clips + title overlays into a 9:16 reel
 * via the Shotstack render API, then polls until the MP4 is ready. Async render,
 * so this submits and waits (bounded) for the route's max duration.
 */
class ShotstackVideoProvider implements VideoProvider {
  private readonly key = process.env.SHOTSTACK_API_KEY ?? "";
  // "v1" = production, "stage" = sandbox. Default to stage so unkeyed/test envs
  // never hit production by accident.
  private readonly env = process.env.SHOTSTACK_ENV ?? "stage";
  private get base() {
    return `https://api.shotstack.io/${this.env}`;
  }

  private assertKey() {
    if (!this.key) throw new Error("VIDEO_PROVIDER=shotstack requires SHOTSTACK_API_KEY.");
  }

  private buildEdit(sb: Storyboard) {
    let start = 0;
    const clips = sb.scenes.map((scene) => {
      const length = scene.durationSec;
      const imageClip = scene.photoUrl
        ? {
            asset: { type: "image", src: scene.photoUrl },
            start,
            length,
            fit: "cover",
            effect: "zoomIn",
          }
        : {
            asset: { type: "html", html: `<div></div>`, background: "#0E2A47" },
            start,
            length,
          };
      const titleClip = scene.onScreenText
        ? {
            asset: { type: "title", text: scene.onScreenText, style: "subtitle", size: "medium" },
            start,
            length,
          }
        : null;
      start += length;
      return [imageClip, ...(titleClip ? [titleClip] : [])];
    });

    return {
      timeline: { background: "#000000", tracks: [{ clips: clips.flat() }] },
      output: { format: "mp4", size: { width: 1080, height: 1920 } },
    };
  }

  async render(input: { storyboard: Storyboard }): Promise<{ url: string }> {
    this.assertKey();
    const submit = await fetch(`${this.base}/render`, {
      method: "POST",
      headers: { "x-api-key": this.key, "Content-Type": "application/json" },
      body: JSON.stringify(this.buildEdit(input.storyboard)),
    });
    if (!submit.ok) throw new Error(`Shotstack submit failed (${submit.status}): ${await submit.text()}`);
    const submitted = await submit.json();
    const id = submitted?.response?.id;
    if (!id) throw new Error("Shotstack did not return a render id.");

    // Poll until done (bounded). Render of a short reel typically completes fast.
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const stat = await fetch(`${this.base}/render/${id}`, { headers: { "x-api-key": this.key } });
      if (!stat.ok) continue;
      const json = await stat.json();
      const status = json?.response?.status;
      if (status === "done" && json?.response?.url) return { url: json.response.url as string };
      if (status === "failed") throw new Error("Shotstack render failed.");
    }
    throw new Error("Shotstack render is still processing — try again shortly.");
  }
}

let cached: VideoProvider | undefined;

export function getVideoProvider(): VideoProvider {
  if (cached) return cached;
  const which = process.env.VIDEO_PROVIDER ?? "stub";
  switch (which) {
    case "shotstack":
      cached = new ShotstackVideoProvider();
      break;
    default:
      cached = new StubVideoProvider();
  }
  return cached;
}
