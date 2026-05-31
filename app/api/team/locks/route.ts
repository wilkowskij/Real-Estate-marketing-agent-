import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { LOCKABLE_FIELDS } from "@/lib/branding/resolveBrand";

export const runtime = "nodejs";

const Body = z.object({
  lockedFields: z.array(z.enum(LOCKABLE_FIELDS)),
});

/**
 * Set which brand fields are locked against member override. Admin-only;
 * writes locked_fields on the org's default brand kit.
 */
export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Only org admins can lock brand fields." },
      { status: 403 }
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // De-dupe while preserving the canonical field order.
  const locked = LOCKABLE_FIELDS.filter((f) => parsed.data.lockedFields.includes(f));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("brand_kits")
    .update({ locked_fields: locked })
    .eq("id", ctx.orgKit.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
