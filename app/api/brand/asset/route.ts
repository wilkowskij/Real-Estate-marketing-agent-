import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { orgPath, MEDIA_BUCKET, signedUrl } from "@/lib/storage";

export const runtime = "nodejs";

/** Which brand slot the uploaded image fills. */
const SLOTS = ["logo_light", "logo_dark", "headshot"] as const;
type Slot = (typeof SLOTS)[number];

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Upload a branding image (company logo light/dark, or an agent headshot) and
 * point the right record at it:
 *   - logo_light / logo_dark → the org's default brand kit (admins only, so the
 *     whole team renders on-brand)
 *   - headshot → the signed-in user's own profile (always allowed)
 *
 * Stores under the org-namespaced Storage prefix the RLS policy expects.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const slot = form.get("slot") as Slot | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!slot || !SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
  }

  const isLogo = slot === "logo_light" || slot === "logo_dark";
  if (isLogo && ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Only org admins can upload company logos." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const folder = isLogo ? "branding" : "headshots";
  const path = orgPath(ctx.orgId, folder, `${slot}-${crypto.randomUUID()}.${ext}`);

  const up = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  // Record an asset row for bookkeeping, then point the right record at the path.
  await supabase.from("assets").insert({
    org_id: ctx.orgId,
    storage_path: path,
    kind: isLogo ? "logo" : "headshot",
  });

  if (slot === "logo_light") {
    const { error } = await supabase
      .from("brand_kits")
      .update({ logo_light_path: path })
      .eq("id", ctx.orgKit.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (slot === "logo_dark") {
    const { error } = await supabase
      .from("brand_kits")
      .update({ logo_dark_path: path })
      .eq("id", ctx.orgKit.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // headshot → upsert the user's profile
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: ctx.userId, headshot_path: path });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    slot,
    storagePath: path,
    previewUrl: await signedUrl(supabase, path),
  });
}
