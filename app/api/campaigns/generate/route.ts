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
    .select("id, storage_path")
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

  const heroPath = assets.find((a) => a.id === design.heroAssetId)!.storage_path;
  const heroUrl = (await signedUrl(supabase, heroPath))!;
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
  });
}
