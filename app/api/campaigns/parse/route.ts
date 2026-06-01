import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrgContext } from "@/lib/org";
import { parseBrief } from "@/lib/agents/parseBrief";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ prompt: z.string().min(3).max(2000) });

/**
 * Parse a free-text campaign brief into structured fields the generator UI
 * pre-fills. Auth-gated but cheap (fast model); does not generate anything.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a short description first." }, { status: 400 });
  }

  try {
    const { brief } = await parseBrief(parsed.data.prompt);
    return NextResponse.json({ brief });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not read that." }, { status: 500 });
  }
}
