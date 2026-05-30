import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { signedUrl, orgPath, MEDIA_BUCKET } from "@/lib/storage";
import { runMarketingAgent } from "@/lib/agents/marketing";
import { runDesignAgent } from "@/lib/agents/design";
import { renderCampaignPng } from "@/lib/design/render";
import { PLATFORM_SIZES, DEFAULT_SIZE } from "@/lib/design/platforms";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  type: z.enum([
    "just_sold",
    "new_listing",
    "open_house",
    "market_stat",
    "neighborhood_spotlight",
    "deal_of_week",
    "before_after",
    "educational",
    "testimonial",
    "custom",
  ]),
  listing: z
    .object({
      address: z.string().optional(),
      town: z.string().optional(),
      price: z.number().nullable().optional(),
      beds: z.number().nullable().optional(),
      baths: z.number().nullable().optional(),
      sqft: z.number().nullable().optional(),
    })
    .optional(),
  instructions: z.string().optional(),
  photoAssetIds: z.array(z.string().uuid()).min(1),
  sizeKey: z.string().optional(),
  /** When true, AI-enhance the hero photo (sky/lawn/exposure) before rendering. */
  enhance: z.boolean().optional(),
});

/**
 * Core generator: copy (Marketing Agent) + hero selection (Design Agent) +
 * branded PNG (template renderer). Persists assets + a campaign row.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createSupabaseServerClient();

  // Load the chosen photos (RLS guarantees they belong to this org).
  const { data: assets, error: assetErr } = await supabase
    .from("assets")
    .select("id, storage_path, listing_id")
    .in("id", input.photoAssetIds);
  if (assetErr || !assets?.length) {
    return NextResponse.json({ error: "Photos not found" }, { status: 404 });
  }

  const photoRefs = await Promise.all(
    assets.map(async (a) => ({
      assetId: a.id,
      url: (await signedUrl(supabase, a.storage_path)) ?? "",
    }))
  );

  // 1) Copy + 2) hero photo — run in parallel.
  const [marketing, design] = await Promise.all([
    runMarketingAgent({
      type: input.type,
      listing: input.listing,
      instructions: input.instructions,
      agentName: ctx.brand.agent.fullName ?? undefined,
    }),
    runDesignAgent({ photos: photoRefs, campaignType: input.type }),
  ]);

  // Fall back to the first uploaded photo if the design agent's hero id isn't
  // among the loaded assets (defensive — should always match).
  const heroAsset = assets.find((a) => a.id === design.heroAssetId) ?? assets[0];
  let heroUrl = await signedUrl(supabase, heroAsset.storage_path);
  if (!heroUrl) {
    return NextResponse.json({ error: "Could not load the hero photo." }, { status: 500 });
  }

  // Optional AI enhancement of the hero photo. Best-effort: if the provider is
  // a stub or errors, fall back to the original photo rather than failing.
  let enhanced = false;
  if (input.enhance && design.enhancementPrompt) {
    try {
      const { getImageProvider } = await import("@/lib/design/imageProvider");
      const out = await getImageProvider().enhance({ imageUrl: heroUrl, prompt: design.enhancementPrompt });
      const enhPath = orgPath(ctx.orgId, "ai", `${crypto.randomUUID()}.png`);
      const up = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(enhPath, out.bytes, { contentType: out.contentType, upsert: true });
      if (!up.error) {
        await supabase.from("assets").insert({
          org_id: ctx.orgId,
          storage_path: enhPath,
          kind: "ai_enhanced",
          listing_id: heroAsset.listing_id ?? null,
        });
        const enhUrl = await signedUrl(supabase, enhPath);
        if (enhUrl) { heroUrl = enhUrl; enhanced = true; }
      }
    } catch {
      // Enhancement is optional polish — keep the original hero on any failure.
    }
  }
  const [logoUrl, headshotUrl] = await Promise.all([
    signedUrl(supabase, ctx.brand.logoLightPath),
    signedUrl(supabase, ctx.brand.agent.headshotPath),
  ]);

  // 3) Render branded PNG.
  const size = (input.sizeKey && PLATFORM_SIZES[input.sizeKey]) || DEFAULT_SIZE;
  const png = await renderCampaignPng({
    type: input.type,
    brand: ctx.brand,
    photoUrl: heroUrl,
    logoUrl,
    headshotUrl,
    listing: input.listing,
    headline: marketing.copy.headline,
    width: size.width,
    height: size.height,
  });

  // Persist the rendered graphic + asset row.
  const renderPath = orgPath(ctx.orgId, "renders", `${crypto.randomUUID()}.png`);
  const up = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(renderPath, png, { contentType: "image/png", upsert: true });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  const { data: renderedAsset } = await supabase
    .from("assets")
    .insert({
      org_id: ctx.orgId,
      storage_path: renderPath,
      kind: "rendered",
      width: size.width,
      height: size.height,
    })
    .select("id")
    .single();

  const { data: campaign } = await supabase
    .from("campaigns")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      type: input.type,
      copy: marketing.copy,
      brand_kit_id: ctx.memberKit?.id ?? ctx.orgKit.id,
      rendered_asset_id: renderedAsset?.id ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  // Audit the agent runs (best-effort).
  await supabase.from("agent_runs").insert([
    {
      org_id: ctx.orgId,
      agent: "marketing",
      output: marketing.copy,
      input_tokens: marketing.usage.input,
      output_tokens: marketing.usage.output,
    },
    { org_id: ctx.orgId, agent: "design", output: design as any },
  ]);

  const previewUrl = await signedUrl(supabase, renderPath);
  return NextResponse.json({
    campaignId: campaign?.id,
    copy: marketing.copy,
    design,
    previewUrl,
    enhanced,
  });
}
