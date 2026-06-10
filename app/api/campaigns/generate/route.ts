import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { signedUrl, orgPath, MEDIA_BUCKET } from "@/lib/storage";
import { runMarketingAgent } from "@/lib/agents/marketing";
import { runDesignAgent } from "@/lib/agents/design";
import { renderCampaignPng } from "@/lib/design/render";
import { PLATFORM_SIZES, DEFAULT_SIZE } from "@/lib/design/platforms";
import { MODEL, estimateCostUsd } from "@/lib/anthropic/client";
import { aiCampaignsRemaining, recordUsage } from "@/lib/billing/subscription";
import { detectSlop } from "@/lib/agents/stopSlop";
import { areaLabel, localTermsFor } from "@/lib/branding/marketArea";

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
  /** Reuse an existing listing instead of creating one from `listing`. */
  listingId: z.string().uuid().optional(),
  instructions: z.string().optional(),
  /** Uploaded photos. Optional when generateImage is true (AI makes the graphic). */
  photoAssetIds: z.array(z.string().uuid()).default([]),
  sizeKey: z.string().optional(),
  /** When true, AI-enhance the hero photo (sky/lawn/exposure) before rendering. */
  enhance: z.boolean().optional(),
  /** When true, generate the post image from scratch with AI (no photo needed). */
  generateImage: z.boolean().optional(),
}).refine((b) => b.photoAssetIds.length > 0 || b.generateImage, {
  message: "Provide at least one photo, or enable AI image generation.",
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

  // Plan gating: enforce the monthly AI-generation allowance for capped plans.
  const remaining = await aiCampaignsRemaining(supabase, ctx.orgId, ctx.subscription.plan);
  if (remaining !== null && remaining <= 0) {
    return NextResponse.json(
      { error: "You've used your monthly AI campaign allowance. Upgrade your plan for more." },
      { status: 402 }
    );
  }

  // Load the chosen photos (RLS guarantees they belong to this org). May be
  // empty when the user opts for an AI-generated graphic instead.
  let assets: { id: string; storage_path: string; listing_id: string | null }[] = [];
  if (input.photoAssetIds.length > 0) {
    const { data, error: assetErr } = await supabase
      .from("assets")
      .select("id, storage_path, listing_id")
      .in("id", input.photoAssetIds);
    if (assetErr || !data?.length) {
      return NextResponse.json({ error: "Photos not found" }, { status: 404 });
    }
    assets = data;
  }
  // AI generation kicks in when explicitly requested or when no photo exists.
  const useGeneratedImage = input.generateImage || assets.length === 0;

  const photoRefs = await Promise.all(
    assets.map(async (a) => ({
      assetId: a.id,
      url: (await signedUrl(supabase, a.storage_path)) ?? "",
    }))
  );

  // Resolve the listing this campaign is about. Reuse an explicit listingId,
  // else persist a new listings row when an address was provided (so campaigns
  // and their photos are tied to a real property record, not just inline text).
  let listingId: string | null = input.listingId ?? null;
  if (!listingId && input.listing?.address) {
    const { data: listing } = await supabase
      .from("listings")
      .insert({
        org_id: ctx.orgId,
        created_by: ctx.userId,
        address: input.listing.address,
        town: input.listing.town ?? null,
        state: ctx.brand.marketArea.state,
        county: ctx.brand.marketArea.county,
        price: input.listing.price ?? null,
        beds: input.listing.beds ?? null,
        baths: input.listing.baths ?? null,
        sqft: input.listing.sqft ?? null,
        status: input.type === "just_sold" ? "sold" : "active",
        source: "campaign",
      })
      .select("id")
      .single();
    listingId = listing?.id ?? null;
    // Backfill the uploaded photos with the new listing id.
    if (listingId) {
      await supabase
        .from("assets")
        .update({ listing_id: listingId })
        .in("id", input.photoAssetIds)
        .is("listing_id", null);
    }
  }

  // 1) Copy (always) + 2) hero-photo selection (only when photos exist).
  // Wrap the model calls so an upstream failure (e.g. Anthropic billing /
  // rate-limit / invalid request) returns a readable JSON error instead of an
  // empty 500 body that the client can't parse ("Unexpected end of JSON input").
  let marketing: Awaited<ReturnType<typeof runMarketingAgent>>;
  let design: Awaited<ReturnType<typeof runDesignAgent>> | null;
  try {
    [marketing, design] = await Promise.all([
      runMarketingAgent({
        type: input.type,
        listing: input.listing,
        instructions: input.instructions,
        agentName: ctx.brand.agent.fullName ?? undefined,
        marketArea: ctx.brand.marketArea,
        disclaimer: ctx.brand.disclaimer,
      }),
      photoRefs.length > 0
        ? runDesignAgent({ photos: photoRefs, campaignType: input.type })
        : Promise.resolve(null),
    ]);
  } catch (e: any) {
    return NextResponse.json({ error: friendlyAiError(e) }, { status: 502 });
  }

  let heroAsset: { id: string; storage_path: string; listing_id: string | null } | null = null;
  let heroUrl: string | null = null;
  let enhanced = false;
  let generatedImage = false;

  // AI image generation path — make the post graphic from scratch (no photo).
  if (useGeneratedImage) {
    try {
      const { buildImagePrompt } = await import("@/lib/agents/imagePrompt");
      const { getImageProvider } = await import("@/lib/design/imageProvider");
      const size0 = (input.sizeKey && PLATFORM_SIZES[input.sizeKey]) || DEFAULT_SIZE;
      const { prompt } = await buildImagePrompt({
        type: input.type,
        headline: marketing.copy.headline,
        area: input.listing?.town
          ? `${input.listing.town}, ${ctx.brand.marketArea.state}`
          : areaLabel(ctx.brand.marketArea),
        colors: ctx.brand.colors,
        instructions: input.instructions,
      });
      const out = await getImageProvider().generate({ prompt, width: size0.width, height: size0.height });
      const genPath = orgPath(ctx.orgId, "ai", `${crypto.randomUUID()}.png`);
      const up = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(genPath, out.bytes, { contentType: out.contentType, upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { data: genAsset } = await supabase
        .from("assets")
        .insert({ org_id: ctx.orgId, storage_path: genPath, kind: "ai_generated", listing_id: listingId })
        .select("id, storage_path, listing_id")
        .single();
      heroAsset = genAsset ?? null;
      heroUrl = await signedUrl(supabase, genPath);
      generatedImage = true;
    } catch (e: any) {
      // If there is no uploaded photo to fall back to, this is fatal.
      if (assets.length === 0) {
        return NextResponse.json({ error: `AI image generation failed: ${e.message}` }, { status: 502 });
      }
    }
  }

  // Photo path (or generation fell back to an uploaded photo).
  if (!heroUrl) {
    heroAsset = (design && assets.find((a) => a.id === design.heroAssetId)) || assets[0] || null;
    if (!heroAsset) {
      return NextResponse.json({ error: "No image available to render." }, { status: 400 });
    }
    heroUrl = await signedUrl(supabase, heroAsset.storage_path);
    if (!heroUrl) {
      return NextResponse.json({ error: "Could not load the hero photo." }, { status: 500 });
    }
  }

  // Optional AI enhancement of an uploaded hero photo. Best-effort.
  if (input.enhance && design?.enhancementPrompt && heroAsset) {
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
    photoUrl: heroUrl as string,
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
      listing_id: listingId,
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
      cost_usd: estimateCostUsd(MODEL, marketing.usage.input, marketing.usage.output),
    },
    { org_id: ctx.orgId, agent: "design", output: design as any },
  ]);

  // Meter this generation against the org's plan allowance.
  await recordUsage(supabase, ctx.orgId, "ai_generation", 1, { type: input.type });
  if (generatedImage) await recordUsage(supabase, ctx.orgId, "image_generation", 1);

  const previewUrl = await signedUrl(supabase, renderPath);
  const slop = detectSlop(marketing.copy, {
    localTerms: localTermsFor(ctx.brand.marketArea),
    areaLabel: areaLabel(ctx.brand.marketArea),
  });
  return NextResponse.json({
    campaignId: campaign?.id,
    listingId,
    copy: marketing.copy,
    design,
    previewUrl,
    enhanced,
    generatedImage,
    slopIssues: slop.clean ? [] : slop.issues,
  });
}

/**
 * Turn an Anthropic SDK error into a clear, actionable message for the UI.
 * The most common production failure is an account-level billing block, which
 * the API returns as a 400 invalid_request_error — surface that plainly so the
 * agent knows to top up credits rather than chasing a phantom code bug.
 */
function friendlyAiError(e: any): string {
  const raw = String(e?.message ?? e ?? "AI generation failed");
  if (/credit balance is too low|billing|payment/i.test(raw)) {
    return "Your Anthropic API account is out of credits. Add credits in the Anthropic Console (Billing) to generate content.";
  }
  if (/rate limit|overloaded|529|429/i.test(raw)) {
    return "The AI service is rate-limited right now. Wait a moment and try again.";
  }
  if (/api key|authentication|401/i.test(raw)) {
    return "The ANTHROPIC_API_KEY is missing or invalid in the deployment settings.";
  }
  return `AI generation failed: ${raw.slice(0, 300)}`;
}
