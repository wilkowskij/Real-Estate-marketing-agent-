import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

/**
 * GET /api/qr?url=<encoded>&size=200
 * Server-side proxy for api.qrserver.com so the browser doesn't hit CORS.
 * Requires authentication — org members only.
 */
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const url  = searchParams.get("url");
  const size = Number(searchParams.get("size") ?? "200");

  if (!url) return NextResponse.json({ error: "url parameter required" }, { status: 400 });

  const clampedSize = Math.min(Math.max(size, 50), 1000);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${clampedSize}x${clampedSize}&data=${encodeURIComponent(url)}`;

  const upstream = await fetch(qrApiUrl, { cache: "force-cache" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "QR generation failed" }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type":  upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
