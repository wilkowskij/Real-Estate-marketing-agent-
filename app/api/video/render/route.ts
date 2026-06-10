import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrgContext } from "@/lib/org";
import { buildStoryboard } from "@/lib/video/storyboard";
import { getVideoProvider, isVideoConfigured } from "@/lib/video/videoProvider";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  reelScript: z.array(z.string()).min(1),
  photoUrls: z.array(z.string().url()).max(20).optional(),
  headline: z.string().max(200).optional(),
  caption: z.string().max(4000).optional(),
  cta: z.string().max(200).optional(),
  secondsPerScene: z.number().min(2).max(6).optional(),
});

/**
 * Assemble a reel from a generated reel script. Always returns the storyboard
 * (a ready-to-film shot list); also returns a rendered MP4 url when a video
 * provider is configured. Never fails just because rendering is off — the
 * storyboard is the deliverable, the video is the bonus.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const storyboard = buildStoryboard(b);

  if (!isVideoConfigured()) {
    return NextResponse.json({
      storyboard,
      videoUrl: null,
      rendered: false,
      message: "Video rendering isn't enabled — film or export the shot list below.",
    });
  }

  try {
    const { url } = await getVideoProvider().render({ storyboard });
    return NextResponse.json({ storyboard, videoUrl: url, rendered: true });
  } catch (e: any) {
    // Rendering failed, but the storyboard is still useful — return it with a note.
    return NextResponse.json({
      storyboard,
      videoUrl: null,
      rendered: false,
      message: e?.message ?? "Reel render failed; the shot list is ready to film.",
    });
  }
}
