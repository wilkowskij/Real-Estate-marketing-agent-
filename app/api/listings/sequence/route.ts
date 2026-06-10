import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export const runtime = "nodejs";

const Body = z.object({
  address:   z.string().min(1),
  town:      z.string().optional(),
  price:     z.number().positive().optional(),
  beds:      z.number().int().positive().optional(),
  baths:     z.number().positive().optional(),
  sqft:      z.number().positive().optional(),
  platform:  z.enum(["instagram", "facebook", "linkedin", "x"]).default("instagram"),
  startDate: z.string().optional(),
});

type ListingData = z.infer<typeof Body>;

const SEQUENCE = [
  { day:  0, type: "new_listing" },
  { day:  3, type: "educational" },
  { day:  7, type: "neighborhood_spotlight" },
  { day: 10, type: "market_stat" },
  { day: 14, type: "testimonial" },
] as const;

function buildCaption(type: string, listing: ListingData): string {
  const addr = listing.address;
  const town = listing.town ? ` in ${listing.town}` : "";
  const price = listing.price
    ? ` — $${listing.price.toLocaleString("en-US")}`
    : "";
  const specs = [
    listing.beds  ? `${listing.beds} bd`  : "",
    listing.baths ? `${listing.baths} ba` : "",
    listing.sqft  ? `${listing.sqft.toLocaleString()} sqft` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  switch (type) {
    case "new_listing":
      return [
        `✨ Just listed: ${addr}${town}${price}`,
        specs,
        "",
        "This one won't last long — reach out today to schedule your private showing.",
      ]
        .filter((l) => l !== "")
        .join("\n");

    case "educational":
      return [
        `📍 Taking a closer look at ${addr}${town}:`,
        specs ? `${specs} — every feature has a story worth knowing.` : "",
        "",
        "What makes a home stand out in today's market? Let's walk through it.",
      ]
        .filter((l) => l !== "")
        .join("\n");

    case "neighborhood_spotlight":
      return [
        `🏘 Location is everything — and ${listing.town ?? "this neighborhood"} delivers.`,
        "",
        `Parks, schools, commute routes, local favorites — here's why ${addr} is perfectly positioned.`,
      ].join("\n");

    case "market_stat":
      return [
        `📊 What does the market look like right now${listing.town ? ` in ${listing.town}` : ""}?`,
        "",
        `Here's what buyers and sellers need to know before making a move — and how it affects ${addr}.`,
      ].join("\n");

    case "testimonial":
      return [
        `💬 Still thinking about ${addr}${town}${price}?`,
        "",
        "Let's connect and talk about what's possible. I'm here when you're ready to take the next step.",
      ].join("\n");

    default:
      return `Check out ${addr}${town}!`;
  }
}

/**
 * Create a 5-post listing sequence: announce → feature → neighborhood →
 * market stat → follow-up, spaced over 14 days, all as drafts.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const start = b.startDate ? new Date(b.startDate) : new Date();
  start.setHours(9, 0, 0, 0);

  // Build all rows upfront, then bulk-insert as one atomic operation so there
  // are no orphaned partial sequences if a mid-sequence insert fails.
  const rows = SEQUENCE.map((step) => {
    const scheduledAt = new Date(start);
    scheduledAt.setDate(scheduledAt.getDate() + step.day);
    return {
      org_id:       ctx.orgId,
      platform:     b.platform,
      caption:      `[${step.type} · sequence]\n${buildCaption(step.type, b)}`,
      media_paths:  [] as string[],
      scheduled_at: scheduledAt.toISOString(),
      state:        "draft",
    };
  });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .insert(rows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const postIds = (data ?? []).map((r: { id: string }) => r.id);
  return NextResponse.json({ postIds, count: postIds.length });
}
