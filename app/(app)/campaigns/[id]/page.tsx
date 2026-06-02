import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CampaignDetailClient } from "./CampaignDetailClient";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx) notFound();

  const supabase = createSupabaseServerClient();
  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select("id, name, objective, status, starts_on, ends_on, created_at")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!campaign) notFound();

  const [{ data: posts }, { data: messages }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, platform, caption, state, scheduled_at")
      .eq("marketing_campaign_id", params.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("campaign_messages")
      .select("id, channel, campaign_type, content, state, created_at")
      .eq("marketing_campaign_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CampaignDetailClient
      campaign={campaign as any}
      posts={(posts as any) ?? []}
      messages={(messages as any) ?? []}
    />
  );
}
