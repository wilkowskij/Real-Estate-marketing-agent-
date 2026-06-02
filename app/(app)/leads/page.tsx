import QRCode from "qrcode";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LeadsClient, type FormCard, type LeadRow } from "./LeadsClient";

export const dynamic = "force-dynamic";

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

export default async function LeadsPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  const [{ data: forms }, { data: leads }] = ctx
    ? await Promise.all([
        supabase
          .from("lead_forms")
          .select("id, slug, title, kind, active, created_at")
          .eq("org_id", ctx.orgId)
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("id, name, email, phone, message, source, status, lead_form_id, created_at")
          .eq("org_id", ctx.orgId)
          .order("created_at", { ascending: false })
          .limit(200),
      ])
    : [{ data: [] }, { data: [] }];

  const origin = appOrigin();
  const formCards: FormCard[] = await Promise.all(
    (forms ?? []).map(async (f) => {
      const url = origin ? `${origin}/l/${f.slug}` : `/l/${f.slug}`;
      let qr = "";
      try {
        qr = await QRCode.toDataURL(url, { width: 220, margin: 1 });
      } catch {
        /* QR optional */
      }
      return {
        id: f.id,
        slug: f.slug,
        title: f.title,
        kind: f.kind,
        active: f.active,
        url,
        qr,
      };
    })
  );

  const formTitle = new Map((forms ?? []).map((f) => [f.id, f.title]));
  const leadRows: LeadRow[] = (leads ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    formTitle: l.lead_form_id ? formTitle.get(l.lead_form_id) ?? null : null,
    createdAt: l.created_at,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Leads</p>
      <h1 className="mt-2 text-4xl text-navy">Capture &amp; convert.</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Spin up a landing page or open-house sign-in, share the link or QR code,
        and every contact lands here in your pipeline.
      </p>

      <LeadsClient forms={formCards} leads={leadRows} hasOrigin={!!origin} />
    </div>
  );
}
