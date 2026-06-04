import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { createFeedbackPage, notionConfigured } from "@/lib/notion/feedback";

export const runtime = "nodejs";

const CreateBody = z.object({
  type: z.enum(["bug", "feedback", "feature"]).default("feedback"),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  contactEmail: z.string().email().max(200).optional(),
  pageUrl: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createSupabaseServerClient();

  // Capture first — this must succeed even if Notion is down or unconfigured.
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      type: b.type,
      subject: b.subject,
      message: b.message,
      contact_email: b.contactEmail ?? null,
      page_url: b.pageUrl ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort mirror into Notion for triage/prioritization.
  let notionSynced = false;
  if (notionConfigured()) {
    const page = await createFeedbackPage({
      type: b.type,
      subject: b.subject,
      message: b.message,
      contactEmail: b.contactEmail ?? null,
      pageUrl: b.pageUrl ?? null,
      orgId: ctx.orgId,
      userId: ctx.userId,
    });
    if (page) {
      notionSynced = true;
      await supabase
        .from("feedback")
        .update({ notion_page_id: page.pageId, notion_synced_at: new Date().toISOString() })
        .eq("id", data.id);
    }
  }

  return NextResponse.json({ id: data.id, notionSynced });
}
