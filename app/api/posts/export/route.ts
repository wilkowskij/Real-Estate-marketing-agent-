import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/posts/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns a CSV of all posts in the date range (by scheduled_at).
 * Omit from/to to export all posts for the org.
 */
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("posts")
    .select("id, platform, state, caption, scheduled_at, created_at")
    .eq("org_id", ctx.orgId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (from) query = query.gte("scheduled_at", new Date(from).toISOString());
  if (to)   query = query.lte("scheduled_at", new Date(to + "T23:59:59").toISOString());

  const { data, error } = await query.limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((p) => [
    csvEscape(p.id),
    csvEscape(p.platform),
    csvEscape(p.state),
    csvEscape(p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString("en-US") : ""),
    csvEscape(p.created_at   ? new Date(p.created_at).toLocaleDateString("en-US")   : ""),
    csvEscape(p.caption),
  ].join(","));

  const header = ["id", "platform", "state", "scheduled_date", "created_date", "caption"].join(",");
  const csv = [header, ...rows].join("\n");

  const filename = `posts-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
