import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

/** Campaign detail: the object + its grouped social posts and messages. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: campaign, error } = await supabase
    .from("marketing_campaigns")
    .select("id, name, listing_id, objective, status, starts_on, ends_on, created_at")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (error || !campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: posts }, { data: messages }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, platform, caption, state, scheduled_at")
      .eq("marketing_campaign_id", params.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("campaign_messages")
      .select("id, channel, campaign_type, content, state, created_at")
      .eq("marketing_campaign_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ campaign, posts: posts ?? [], messages: messages ?? [] });
}

const PatchBody = z.object({
  name: z.string().min(1).max(140).optional(),
  objective: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  startsOn: z.string().date().nullable().optional(),
  endsOn: z.string().date().nullable().optional(),
});

/** Update a campaign's name / objective / status / dates. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const update: Record<string, unknown> = {};
  if (b.name !== undefined) update.name = b.name;
  if (b.objective !== undefined) update.objective = b.objective;
  if (b.status !== undefined) update.status = b.status;
  if (b.startsOn !== undefined) update.starts_on = b.startsOn;
  if (b.endsOn !== undefined) update.ends_on = b.endsOn;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("marketing_campaigns")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Delete a campaign. Grouped posts survive (FK set null); messages cascade. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", params.id)
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
