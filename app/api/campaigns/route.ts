import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const CreateBody = z.object({
  name: z.string().min(1).max(140),
  listingId: z.string().uuid().optional(),
  objective: z.string().max(2000).optional(),
  startsOn: z.string().date().optional(),
  endsOn: z.string().date().optional(),
});

/** List the org's campaign objects, newest first, with per-channel counts. */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: campaigns, error } = await supabase
    .from("marketing_campaigns")
    .select("id, name, listing_id, objective, status, starts_on, ends_on, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (campaigns ?? []).map((c) => c.id);
  // Counts of grouped pieces per campaign (cheap two-query fan-in, RLS-scoped).
  const counts = new Map<string, { posts: number; messages: number }>();
  ids.forEach((id) => counts.set(id, { posts: 0, messages: 0 }));
  if (ids.length) {
    const [{ data: posts }, { data: msgs }] = await Promise.all([
      supabase.from("posts").select("marketing_campaign_id").in("marketing_campaign_id", ids),
      supabase
        .from("campaign_messages")
        .select("marketing_campaign_id")
        .in("marketing_campaign_id", ids),
    ]);
    for (const p of posts ?? []) {
      const c = counts.get(p.marketing_campaign_id as string);
      if (c) c.posts += 1;
    }
    for (const m of msgs ?? []) {
      const c = counts.get(m.marketing_campaign_id as string);
      if (c) c.messages += 1;
    }
  }

  return NextResponse.json({
    campaigns: (campaigns ?? []).map((c) => ({
      ...c,
      counts: counts.get(c.id) ?? { posts: 0, messages: 0 },
    })),
  });
}

/** Create a new campaign object. */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      name: b.name,
      listing_id: b.listingId ?? null,
      objective: b.objective ?? null,
      starts_on: b.startsOn ?? null,
      ends_on: b.endsOn ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
