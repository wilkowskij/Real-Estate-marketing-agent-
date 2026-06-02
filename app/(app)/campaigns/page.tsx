import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewCampaignButton } from "./NewCampaignButton";

export const dynamic = "force-dynamic";

/**
 * Campaigns hub — the multi-channel campaign object. Each campaign groups social
 * posts + email/SMS messages around a listing or theme with a single strategy.
 */
export default async function CampaignsPage() {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();

  const { data: campaigns } = ctx
    ? await supabase
        .from("marketing_campaigns")
        .select("id, name, objective, status, starts_on, ends_on, created_at")
        .eq("org_id", ctx.orgId)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Per-campaign piece counts (one query each, RLS-scoped).
  const ids = (campaigns ?? []).map((c) => c.id);
  const counts = new Map<string, { posts: number; messages: number }>();
  if (ids.length) {
    const [{ data: posts }, { data: msgs }] = await Promise.all([
      supabase.from("posts").select("marketing_campaign_id").in("marketing_campaign_id", ids),
      supabase
        .from("campaign_messages")
        .select("marketing_campaign_id")
        .in("marketing_campaign_id", ids),
    ]);
    ids.forEach((id) => counts.set(id, { posts: 0, messages: 0 }));
    for (const p of posts ?? []) {
      const c = counts.get(p.marketing_campaign_id as string);
      if (c) c.posts += 1;
    }
    for (const m of msgs ?? []) {
      const c = counts.get(m.marketing_campaign_id as string);
      if (c) c.messages += 1;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Campaigns</p>
          <h1 className="mt-2 text-4xl text-navy">Plan it as one story.</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            A campaign ties every channel together — the social posts, the email,
            the text — under one listing and one strategy.
          </p>
        </div>
        <NewCampaignButton />
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <Card className="mt-8">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No campaigns yet. Create one (e.g. “14 Riverside Ave — Just Sold
              push”), then attach posts from the calendar queue and save emails or
              texts to it from Create.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const n = counts.get(c.id) ?? { posts: 0, messages: 0 };
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg text-navy">{c.name}</h3>
                      <Badge>{c.status}</Badge>
                    </div>
                    {c.objective && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{c.objective}</p>
                    )}
                    <div className="mt-4 flex gap-4 text-xs text-ink-soft">
                      <span>📱 {n.posts} post{n.posts !== 1 ? "s" : ""}</span>
                      <span>✉️💬 {n.messages} message{n.messages !== 1 ? "s" : ""}</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
