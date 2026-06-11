import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";
import { buildOpenHousePacketEmail } from "@/lib/email/templates/openHousePacket";
import { signedUrl, MEDIA_BUCKET } from "@/lib/storage";

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
    .select(
      "id, org_id, listing_id, marketing_campaign_id, kind, active, created_by, packet_mode, packet_pdf_path, packet_details"
    )
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

  // Send open house packet email — fire and forget.
  if (form.kind === "open_house" && b.email) {
    sendOpenHousePacket({
      supabase,
      orgId: form.org_id,
      listingId: form.listing_id,
      agentUserId: form.created_by,
      packetMode: (form.packet_mode ?? "mls") as "mls" | "manual" | "pdf",
      packetPdfPath: form.packet_pdf_path ?? null,
      packetDetails: (form.packet_details ?? {}) as Record<string, unknown>,
      recipientName: b.name ?? "there",
      recipientEmail: b.email,
    }).catch(() => {/* silently swallow — email is best-effort */});
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Email helper
// ---------------------------------------------------------------------------

async function sendOpenHousePacket({
  supabase,
  orgId,
  listingId,
  agentUserId,
  packetMode,
  packetPdfPath,
  packetDetails,
  recipientName,
  recipientEmail,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  orgId: string;
  listingId: string | null;
  agentUserId: string;
  packetMode: "mls" | "manual" | "pdf";
  packetPdfPath: string | null;
  packetDetails: Record<string, unknown>;
  recipientName: string;
  recipientEmail: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  const [profileRes, brandRes] = await Promise.all([
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

  const profile = profileRes.data;
  const brand = brandRes.data;
  const contact = (profile?.contact_block ?? {}) as Record<string, string>;
  const accentColor = (brand?.colors as Record<string, string> | null)?.accent ?? "#C9A96E";

  let logoUrl: string | null = null;
  if (brand?.logo_light_path) {
    logoUrl = await signedUrl(supabase, brand.logo_light_path, 7 * 24 * 3600);
  }

  const agentInfo = {
    fullName: profile?.full_name ?? "Your Agent",
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    licenseNumber: profile?.license_number ?? null,
  };
  const orgInfo = { name: brand?.name ?? "Marquee", logoUrl, accentColor };

  // ── PDF mode: attach the pre-made PDF ─────────────────────────────────
  if (packetMode === "pdf" && packetPdfPath) {
    const { data: pdfData, error: dlError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .download(packetPdfPath);
    if (dlError || !pdfData) return;

    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());
    const subject = `Your open house packet`;

    const html = buildSimplePdfEmail({ recipientName, agent: agentInfo, org: orgInfo, accentColor });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
      attachments: [{ filename: "open-house-packet.pdf", content: pdfBuffer }],
    });
    return;
  }

  // ── Manual mode: use agent-entered details ─────────────────────────────
  if (packetMode === "manual") {
    const det = packetDetails as {
      address?: string; town?: string; state?: string; price?: number;
      beds?: number; baths?: number; sqft?: number; description?: string;
    };
    const { subject, html } = buildOpenHousePacketEmail({
      recipientName,
      listing: {
        address: det.address ?? "Property",
        town: det.town ?? null,
        state: det.state ?? "NJ",
        price: det.price ?? null,
        beds: det.beds ?? null,
        baths: det.baths ?? null,
        sqft: det.sqft ?? null,
        description: det.description ?? null,
        photoUrl: null,
      },
      agent: agentInfo,
      org: orgInfo,
    });
    await resend.emails.send({ from: FROM_EMAIL, to: recipientEmail, subject, html });
    return;
  }

  // ── MLS mode (default): pull listing from DB ───────────────────────────
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

  const listingRow = listingId
    ? (
        await supabase
          .from("listings")
          .select("address, town, state, price, beds, baths, sqft, description")
          .eq("id", listingId)
          .maybeSingle()
      ).data
    : null;

  const { subject, html } = buildOpenHousePacketEmail({
    recipientName,
    listing: listingRow
      ? { ...listingRow, photoUrl }
      : { address: "Property", state: "NJ" },
    agent: agentInfo,
    org: orgInfo,
  });
  await resend.emails.send({ from: FROM_EMAIL, to: recipientEmail, subject, html });
}

// Simple HTML email body used with PDF attachments.
function buildSimplePdfEmail({
  recipientName,
  agent,
  org,
  accentColor,
}: {
  recipientName: string;
  agent: { fullName: string; email?: string | null; phone?: string | null };
  org: { name: string; logoUrl?: string | null };
  accentColor: string;
}): string {
  const logoBlock = org.logoUrl
    ? `<img src="${org.logoUrl}" alt="${org.name}" height="36" style="display:block;height:36px;margin-bottom:8px" />`
    : `<span style="font-size:22px;font-weight:700;color:#1a2a3a">${org.name}</span>`;

  const agentLine = [agent.phone, agent.email].filter(Boolean).join(" · ");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Open House Packet</title></head>
<body style="margin:0;padding:0;background:#f5f1ec;font-family:Georgia,serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f1ec;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600"
             style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
        <tr><td style="background:${accentColor};height:4px;font-size:0">&nbsp;</td></tr>
        <tr><td style="padding:32px 40px">
          ${logoBlock}
          <p style="margin:20px 0 8px;font-size:16px;color:#333">Hi ${recipientName},</p>
          <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.7">
            Thank you for visiting today! Your open house packet is attached to this email.
            Feel free to reach out with any questions.
          </p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#1a2a3a">${agent.fullName}</p>
          ${agentLine ? `<p style="margin:4px 0 0;font-size:14px;color:#555">${agentLine}</p>` : ""}
        </td></tr>
        <tr><td style="background:#1a2a3a;padding:16px 40px;border-radius:0 0 8px 8px">
          <p style="margin:0;font-size:11px;color:#aaa">© Equal Housing Opportunity. Powered by Marquee.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
