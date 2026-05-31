import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { MEDIA_BUCKET } from "@/lib/storage";

export const runtime = "nodejs";

/** Remove a library image (org admins only). Deletes the storage object + row. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can manage the brand library." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  // RLS scopes this to the caller's org; also pin kind so only library items go.
  const { data: asset } = await supabase
    .from("assets")
    .select("id, storage_path")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .eq("kind", "library")
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
  const { error } = await supabase.from("assets").delete().eq("id", asset.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
