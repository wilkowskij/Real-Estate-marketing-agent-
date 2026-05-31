import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";

/**
 * Brand image library — reusable company imagery (office/team photos, generic
 * area backgrounds) that the design agent can pull into posts where a listing
 * photo isn't the focus (recurring market updates, trend posts).
 */
export default async function LibraryPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const supabase = createSupabaseServerClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path, meta, created_at")
    .eq("org_id", ctx.orgId)
    .eq("kind", "library")
    .order("created_at", { ascending: false });

  const initial = await Promise.all(
    (assets ?? []).map(async (a) => ({
      id: a.id,
      label: (a.meta as { label?: string })?.label ?? null,
      previewUrl: await signedUrl(supabase, a.storage_path),
    }))
  );

  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Brand library</p>
      <h1 className="mt-2 text-4xl text-navy">Your reusable imagery.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Office and team photos, neighborhood and shore backgrounds — the imagery
        your posts can reuse when there’s no listing photo to feature.
      </p>

      <LibraryClient initial={initial} canManage={canManage} />
    </div>
  );
}
