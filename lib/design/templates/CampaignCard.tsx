import { badgeLabel, formatPrice, type TemplateProps } from "./types";

/**
 * A single brand-driven layout that covers Just Sold / New Listing / Open House
 * and custom posts. Satori/@vercel/og only supports flexbox + a CSS subset, so
 * every node has an explicit `display: flex` and we avoid `gap` on some nodes.
 *
 * The same component renders fully on-brand for any company or agent because
 * every color, font, logo, and contact value comes from `brand`.
 */
export function CampaignCard(props: TemplateProps) {
  const { brand, type, photoUrl, logoUrl, headshotUrl, listing, headline, width, height } = props;
  const { primary, accent } = brand.colors;
  const price = formatPrice(listing?.price);
  const facts: string[] = [];
  if (listing?.beds != null) facts.push(`${listing.beds} BD`);
  if (listing?.baths != null) facts.push(`${listing.baths} BA`);
  if (listing?.sqft != null) facts.push(`${listing.sqft.toLocaleString()} SQFT`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: primary,
        fontFamily: brand.fonts.body,
        position: "relative",
      }}
    >
      {/* Hero photo fills most of the frame */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          width={width}
          height={Math.round(height * 0.72)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            display: "flex",
            backgroundColor: accent,
            color: "#ffffff",
            padding: "16px 36px",
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 2,
            fontFamily: brand.fonts.heading,
          }}
        >
          {badgeLabel(type)}
        </div>
        {/* Gradient scrim for headline legibility */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 260,
            display: "flex",
            backgroundImage: `linear-gradient(to top, ${primary}, rgba(0,0,0,0))`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 48,
            right: 48,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.05,
              fontFamily: brand.fonts.heading,
            }}
          >
            {headline}
          </div>
        </div>
      </div>

      {/* Footer bar: address / facts / price + agent + logo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "32px 48px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {listing?.address ? (
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
                {listing.address}
              </div>
            ) : null}
            <div style={{ display: "flex", marginTop: 8, opacity: 0.85, fontSize: 26 }}>
              {[listing?.town, facts.join("  •  ")].filter(Boolean).join("   |   ")}
            </div>
            {price ? (
              <div style={{ display: "flex", marginTop: 10, fontSize: 40, fontWeight: 800, color: accent }}>
                {price}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            {headshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headshotUrl}
                alt=""
                width={84}
                height={84}
                style={{ width: 84, height: 84, borderRadius: 42, objectFit: "cover", marginRight: 16 }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {brand.agent.fullName ? (
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
                  {brand.agent.fullName}
                </div>
              ) : null}
              {brand.agent.contact.phone ? (
                <div style={{ display: "flex", fontSize: 22, opacity: 0.85 }}>
                  {brand.agent.contact.phone}
                </div>
              ) : null}
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                height={64}
                style={{ height: 64, marginLeft: 24, objectFit: "contain" }}
              />
            ) : null}
          </div>
        </div>

        {brand.disclaimer ? (
          <div style={{ display: "flex", marginTop: 18, fontSize: 16, opacity: 0.6 }}>
            {brand.disclaimer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
