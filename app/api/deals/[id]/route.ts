import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().nonnegative().nullable().optional(),
  stage: z
    .enum(["prospect", "appointment", "agreement", "under_contract", "closed_won", "closed_lost"])
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const update: Record<string, unknown> = { ...parsed.data };
  // Stamp/clear the close date when the stage moves in/out of a terminal state.
  if (parsed.data.stage) {
    update.closed_at =
      parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost"
        ? new Date().toISOString()
        : null;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("deals")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
