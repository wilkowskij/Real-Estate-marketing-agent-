import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().max(140).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
  /** Honeypot — bots fill this; humans never see it. */
  company: z.string().max(0).optional(),
}).refine((b) => b.email || b.phone, {
  message: "Provide an email or phone so the agent can follow up.",
});

/**
 * PUBLIC lead capture. No auth — this is the endpoint a landing page / QR /
 * open-house form posts to. Uses the service-role client (bypasses RLS) after
 * resolving the form's slug to its org, so a submission can only ever attach to
 * the org that owns that form. A zero-length honeypot field blocks naive bots.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Please check the form and try again." },
      { status: 400 }
    );
  }
  const b = parsed.data;
  // Honeypot tripped → pretend success, write nothing.
  if (b.company && b.company.length > 0) return NextResponse.json({ ok: true });

  const supabase = createSupabaseAdminClient();
  const { data: form } = await supabase
    .from("lead_forms")
    .select("id, org_id, listing_id, marketing_campaign_id, kind, active")
    .eq("slug", b.slug)
    .maybeSingle();
  if (!form || !form.active) {
    return NextResponse.json({ error: "This form is no longer accepting submissions." }, { status: 404 });
  }

  const { error } = await supabase.from("leads").insert({
    org_id: form.org_id,
    lead_form_id: form.id,
    listing_id: form.listing_id,
    marketing_campaign_id: form.marketing_campaign_id,
    name: b.name ?? null,
    email: b.email ?? null,
    phone: b.phone ?? null,
    message: b.message ?? null,
    source: form.kind === "open_house" ? "open_house" : "landing",
  });
  if (error) return NextResponse.json({ error: "Could not submit. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
