import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { LOCKABLE_FIELDS } from "@/lib/branding/resolveBrand";

export const runtime = "nodejs";

const Body = z.object({
  // brand kit (org-level) fields
  name: z.string().min(1).optional(),
  colors: z
    .object({ primary: z.string(), secondary: z.string(), accent: z.string() })
    .optional(),
  disclaimer: z.string().nullable().optional(),
  layoutTheme: z.string().optional(),
  lockedFields: z.array(z.enum(LOCKABLE_FIELDS)).optional(),
  // profile (personal) fields
  fullName: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

/**
 * Save the brand kit + agent profile. Brand-kit fields are written to the
 * org's default kit (admins only, since members inherit/override per the
 * resolver). Personal profile fields are always writable by the user.
 */
export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createSupabaseServerClient();

  // Brand-kit changes require org admin (matches the locked-field model).
  const wantsBrandChange =
    b.name !== undefined ||
    b.colors !== undefined ||
    b.disclaimer !== undefined ||
    b.layoutTheme !== undefined ||
    b.lockedFields !== undefined;

  if (wantsBrandChange) {
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json(
        { error: "Only org admins can edit the company brand kit." },
        { status: 403 }
      );
    }
    const kitUpdate: Record<string, unknown> = {};
    if (b.name !== undefined) kitUpdate.name = b.name;
    if (b.colors !== undefined) kitUpdate.colors = b.colors;
    if (b.disclaimer !== undefined) kitUpdate.disclaimer = b.disclaimer;
    if (b.layoutTheme !== undefined) kitUpdate.layout_theme = b.layoutTheme;
    if (b.lockedFields !== undefined) kitUpdate.locked_fields = b.lockedFields;

    const { error } = await supabase
      .from("brand_kits")
      .update(kitUpdate)
      .eq("id", ctx.orgKit.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Profile is the user's own — always allowed.
  const profileUpdate: Record<string, unknown> = { user_id: ctx.userId };
  if (b.fullName !== undefined) profileUpdate.full_name = b.fullName;
  if (b.licenseNumber !== undefined) profileUpdate.license_number = b.licenseNumber;
  if (b.contact !== undefined) profileUpdate.contact_block = b.contact;

  if (Object.keys(profileUpdate).length > 1) {
    const { error } = await supabase.from("profiles").upsert(profileUpdate);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
