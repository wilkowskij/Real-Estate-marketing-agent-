import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { orgPath, MEDIA_BUCKET, signedUrl } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Brand image library: reusable, org-level imagery (office/team photos, generic
 * area/shore backgrounds) the design agent can pull into posts when a listing
 * photo isn't the focus. Stored as assets with kind='library'.
 */

/** List the org's library images with signed preview URLs. */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, storage_path, meta, created_at")
    .eq("org_id", ctx.orgId)
    .eq("kind", "library")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = await Promise.all(
    (assets ?? []).map(async (a) => ({
      id: a.id,
      label: (a.meta as { label?: string })?.label ?? null,
      previewUrl: await signedUrl(supabase, a.storage_path),
    }))
  );
  return NextResponse.json({ items });
}

/** Upload a new library image (org admins only — it's company branding). */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Only org admins can manage the brand library." },
      { status: 403 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const label = (form.get("label") as string) || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 15MB" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = orgPath(ctx.orgId, "library", `${crypto.randomUUID()}.${ext}`);

  const up = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      org_id: ctx.orgId,
      storage_path: path,
      kind: "library",
      meta: label ? { label } : {},
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: asset.id,
    label,
    previewUrl: await signedUrl(supabase, path),
  });
}
