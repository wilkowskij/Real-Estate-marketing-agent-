import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { orgPath, MEDIA_BUCKET, signedUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload one photo to the org's media bucket and record an asset row.
 * Returns the assetId + a signed preview URL.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const listingId = (form.get("listingId") as string) || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = orgPath(ctx.orgId, "photos", `${crypto.randomUUID()}.${ext}`);

  const up = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      org_id: ctx.orgId,
      listing_id: listingId,
      storage_path: path,
      kind: "photo",
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    assetId: asset.id,
    previewUrl: await signedUrl(supabase, path),
  });
}
