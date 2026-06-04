import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeedbackClient, type FeedbackRow } from "./FeedbackClient";

export const dynamic = "force-dynamic";

/**
 * Customer-facing "your requests" view: each org sees the feedback its own
 * members submitted, with read-only status so they can track what we're doing
 * with it. Status is set by the team (in Notion) and reflected here.
 */
export default async function FeedbackPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  const { data } = ctx
    ? await supabase
        .from("feedback")
        .select("id, type, subject, message, status, created_at")
        .eq("org_id", ctx.orgId)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const rows: FeedbackRow[] = (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    subject: r.subject,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Support</p>
      <h1 className="mt-2 text-4xl text-navy">Your requests</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Everything your team has reported — bugs, feedback, and feature requests —
        with where each one stands. Submit new ones from the “Send support &amp;
        feedback” link at the bottom of any page.
      </p>
      <FeedbackClient rows={rows} />
    </div>
  );
}
