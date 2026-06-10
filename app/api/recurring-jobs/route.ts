import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["local_news", "trend_watch"]),
  cadence: z.string().optional(),
  enabled: z.boolean().optional(),
  auto_publish: z.boolean().optional(),
  auto_approve: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

/** List this org's recurring automation jobs. */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recurring_jobs")
    .select("id, kind, cadence, config, auto_publish, auto_approve, enabled, last_run_at")
    .eq("org_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data ?? [] });
}

/**
 * Upsert a recurring job by kind. If a job of this kind already exists for the
 * org it is updated (only the provided fields), otherwise a new one is inserted.
 * Org members may manage their own org's jobs (RLS enforces the org scope).
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

  const { data: existing } = await supabase
    .from("recurring_jobs")
    .select("id")
    .eq("org_id", ctx.orgId)
    .eq("kind", b.kind)
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = {};
    if (b.cadence !== undefined) update.cadence = b.cadence;
    if (b.enabled !== undefined) update.enabled = b.enabled;
    if (b.auto_publish !== undefined) update.auto_publish = b.auto_publish;
    if (b.auto_approve !== undefined) update.auto_approve = b.auto_approve;
    if (b.config !== undefined) update.config = b.config;

    const { error } = await supabase
      .from("recurring_jobs")
      .update(update)
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("recurring_jobs").insert({
      org_id: ctx.orgId,
      kind: b.kind,
      cadence: b.cadence ?? "weekly",
      enabled: b.enabled ?? true,
      auto_publish: b.auto_publish ?? false,
      auto_approve: b.auto_approve ?? false,
      config: b.config ?? {},
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
