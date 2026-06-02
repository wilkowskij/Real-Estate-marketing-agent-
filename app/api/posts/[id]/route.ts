import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { signedUrl } from "@/lib/storage";

export const runtime = "nodejs";

/** Fetch a single post with signed media URLs for the preview drawer. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, platform, caption, state, scheduled_at, media_paths, created_at")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (error || !post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mediaUrls: string[] = [];
  for (const path of ((post.media_paths as string[] | null) ?? [])) {
    if (path) {
      const url = await signedUrl(supabase, path).catch(() => null);
      if (url) mediaUrls.push(url);
    }
  }

  return NextResponse.json({ ...post, mediaUrls });
}

const Body = z.object({
  state: z.enum(["draft", "approved", "scheduled"]).optional(),
  caption: z.string().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

/** Update a post's state/caption/schedule from the approval queue. RLS-scoped. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("posts").update(parsed.data).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
