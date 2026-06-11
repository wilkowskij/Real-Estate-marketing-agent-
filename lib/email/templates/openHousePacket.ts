/** Inline-styled HTML email for an open-house sign-up packet. */

export interface OpenHousePacketData {
  /** Lead's first name (or full name), used as greeting. */
  recipientName: string;
  listing: {
    address: string;
    town?: string | null;
    state: string;
    price?: number | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    description?: string | null;
    /** Signed URL to a listing photo (optional). */
    photoUrl?: string | null;
  };
  agent: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
  };
  org: {
    name: string;
    /** Signed URL to org logo (optional). */
    logoUrl?: string | null;
    accentColor?: string;
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function buildOpenHousePacketEmail(data: OpenHousePacketData): {
  subject: string;
  html: string;
} {
  const { recipientName, listing, agent, org } = data;
  const accent = org.accentColor ?? "#C9A96E";
  const fullAddress = [listing.address, listing.town, listing.state]
    .filter(Boolean)
    .join(", ");

  const subject = `Your open house packet — ${listing.address}`;

  const statsRows = [
    listing.price ? `<b>Price:</b> $${fmt(listing.price)}` : null,
    listing.beds != null ? `<b>Beds:</b> ${listing.beds}` : null,
    listing.baths != null ? `<b>Baths:</b> ${listing.baths}` : null,
    listing.sqft ? `<b>Sqft:</b> ${fmt(listing.sqft)}` : null,
  ]
    .filter(Boolean)
    .map((s) => `<span style="margin-right:24px">${s}</span>`)
    .join("");

  const photoBlock = listing.photoUrl
    ? `<img src="${listing.photoUrl}" alt="Listing photo" width="600"
         style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px 8px 0 0;object-fit:cover" />`
    : "";

  const descriptionBlock = listing.description
    ? `<p style="color:#555;font-size:15px;line-height:1.7;margin:16px 0">${listing.description}</p>`
    : "";

  const agentContactLines = [
    agent.phone ? `<a href="tel:${agent.phone}" style="color:${accent}">${agent.phone}</a>` : null,
    agent.email ? `<a href="mailto:${agent.email}" style="color:${accent}">${agent.email}</a>` : null,
    agent.licenseNumber ? `License #${agent.licenseNumber}` : null,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const logoBlock = org.logoUrl
    ? `<img src="${org.logoUrl}" alt="${org.name}" height="36"
         style="display:block;height:36px;margin-bottom:8px" />`
    : `<span style="font-size:22px;font-weight:700;color:#1a2a3a">${org.name}</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ec;font-family:Georgia,'Times New Roman',serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background:#f5f1ec;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600"
             style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

        <!-- Photo -->
        <tr><td>${photoBlock}</td></tr>

        <!-- Gold bar -->
        <tr><td style="background:${accent};height:4px;font-size:0">&nbsp;</td></tr>

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px">
          ${logoBlock}
          <h1 style="margin:20px 0 4px;font-size:26px;color:#1a2a3a;line-height:1.2">${fullAddress}</h1>
          ${statsRows ? `<p style="margin:10px 0 0;font-size:14px;color:#555">${statsRows}</p>` : ""}
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:0 40px 24px">
          <p style="font-size:16px;color:#333;margin:0 0 12px">
            Hi ${recipientName}, thank you for visiting us today!
          </p>
          ${descriptionBlock}
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px"><hr style="border:none;border-top:1px solid #e8e0d5;margin:0" /></td></tr>

        <!-- Agent card -->
        <tr><td style="padding:24px 40px">
          <p style="margin:0 0 4px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:.05em">Your agent</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#1a2a3a">${agent.fullName}</p>
          ${agentContactLines ? `<p style="margin:6px 0 0;font-size:14px;color:#555">${agentContactLines}</p>` : ""}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1a2a3a;padding:20px 40px;border-radius:0 0 8px 8px">
          <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6">
            © Equal Housing Opportunity. This communication is from a licensed real estate professional.
            All information deemed reliable but not guaranteed. Square footage, room counts, and other data
            are approximate and should be independently verified.
          </p>
          <p style="margin:8px 0 0;font-size:10px;color:#666">Powered by Marquee</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
