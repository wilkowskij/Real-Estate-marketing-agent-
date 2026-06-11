import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";
import { buildOpenHousePacketEmail } from "@/lib/email/templates/openHousePacket";
import { signedUrl } from "@/lib/storage";

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
    .select("id, org_id, listing_id, marketing_campaign_id, kind, active, created_by")
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

  // Send open house packet email — fire and forget (don't block the response).
  if (form.kind === "open_house" && b.email) {
    sendOpenHousePacket({
      supabase,
      orgId: form.org_id,
      listingId: form.listing_id,
      agentUserId: form.created_by,
      recipientName: b.name ?? "there",
      recipientEmail: b.email,
    }).catch(() => {/* silently swallow — email is best-effort */});
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Email helper — separated so errors never surface to the lead submitter.
// ---------------------------------------------------------------------------

async function sendOpenHousePacket({
  supabase,
  orgId,
  listingId,
  agentUserId,
  recipientName,
  recipientEmail,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  orgId: string;
  listingId: string | null;
  agentUserId: string;
  recipientName: string;
  recipientEmail: string;
}) {
  const resend = getResendClient();
  if (!resend) return; // unconfigured — skip silently

  // Fetch listing, agent profile, and org brand in parallel.
  const [listingRes, profileRes, brandRes] = await Promise.all([
    listingId
      ? supabase
          .from("listings")
          .select("address, town, state, price, beds, baths, sqft, description")
          .eq("id", listingId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("full_name, license_number, contact_block")
      .eq("user_id", agentUserId)
      .maybeSingle(),
    supabase
      .from("brand_kits")
      .select("name, logo_light_path, colors")
      .eq("org_id", orgId)
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  const listing = listingRes.data;
  const profile = profileRes.data;
  const brand = brandRes.data;

  // Resolve a listing photo (first photo asset, 7-day signed URL).
  let photoUrl: string | null = null;
  if (listingId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("storage_path")
      .eq("listing_id", listingId)
      .eq("kind", "photo")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (asset?.storage_path) {
      photoUrl = await signedUrl(supabase, asset.storage_path, 7 * 24 * 3600);
    }
  }

  // Resolve org logo signed URL.
  let logoUrl: string | null = null;
  if (brand?.logo_light_path) {
    logoUrl = await signedUrl(supabase, brand.logo_light_path, 7 * 24 * 3600);
  }

  const contact = (profile?.contact_block ?? {}) as Record<string, string>;
  const accentColor =
    (brand?.colors as Record<string, string> | null)?.accent ?? "#C9A96E";

  const { subject, html } = buildOpenHousePacketEmail({
    recipientName,
    listing: listing
      ? {
          address: listing.address,
          town: listing.town,
          state: listing.state,
          price: listing.price,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          description: listing.description,
          photoUrl,
        }
      : { address: "Property", state: "NJ" },
    agent: {
      fullName: profile?.full_name ?? "Your Agent",
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      licenseNumber: profile?.license_number ?? null,
    },
    org: {
      name: brand?.name ?? "Marquee",
      logoUrl,
      accentColor,
    },
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html,
  });
}
