import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { LeadCaptureForm } from "./LeadCaptureForm";

export const dynamic = "force-dynamic";

/**
 * PUBLIC lead-capture landing page (no auth). Reached from a shared link, a QR
 * code at an open house, or a campaign CTA. Reads the form by slug via the
 * service-role client; submissions post to /api/leads/capture.
 */
export default async function LeadLandingPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseAdminClient();
  const { data: form } = await supabase
    .from("lead_forms")
    .select("slug, title, kind, headline, subhead, active")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!form || !form.active) notFound();

  const headline = form.headline ?? form.title;
  const subhead =
    form.subhead ??
    (form.kind === "open_house"
      ? "Sign in below — we'll share details and any updates on this home."
      : "Leave your details and we'll be in touch shortly.");

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl2 border border-paper-line bg-paper-card p-8 shadow-lift">
          <p className="text-xs font-bold uppercase tracking-editorial text-gold">
            {form.kind === "open_house" ? "Open house" : "Get in touch"}
          </p>
          <h1 className="mt-3 font-display text-3xl text-navy">{headline}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subhead}</p>

          <LeadCaptureForm slug={form.slug} openHouse={form.kind === "open_house"} />
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">
          Powered by Marquee · Fair Housing compliant
        </p>
      </div>
    </main>
  );
}
