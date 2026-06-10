import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isConfigured, type Platform } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

const PLATFORMS: { id: Platform; label: string; blurb: string }[] = [
  { id: "instagram", label: "Instagram", blurb: "Auto-post Reels & feed images to your IG Business account." },
  { id: "facebook", label: "Facebook", blurb: "Publish photo posts to your Facebook Page." },
  { id: "linkedin", label: "LinkedIn", blurb: "Share listings to your LinkedIn profile." },
  { id: "twitter", label: "X (Twitter)", blurb: "Post listing updates to your X account." },
];

/**
 * Connections settings — Buffer-style "connect an account" hub. Connections are
 * per-person: each agent links their own Instagram / Facebook / LinkedIn / X
 * account and publishes from it. Platforms whose OAuth app isn't configured yet
 * show as "Coming soon" (manual export still works).
 */
export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();
  // Show only the signed-in member's own connections (per-person).
  const { data: accounts } = ctx
    ? await supabase
        .from("social_accounts")
        .select("id, platform, account_label, created_at")
        .eq("org_id", ctx.orgId)
        .eq("membership_id", ctx.membershipId)
    : { data: [] as any[] };

  type AccountRow = { id: string; platform: string; account_label: string | null; created_at: string };
  const connectedByPlatform = new Map<string, AccountRow>((accounts ?? []).map((a) => [a.platform, a as AccountRow]));

  return (
    <div>
      <h2 className="text-2xl text-navy">Connected accounts</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Connect your own social accounts once and publish straight from your
        studio — no copy-paste. Until a platform is approved, finished posts
        download for you to post by hand.
      </p>

      {searchParams.connected && (
        <p className="mt-4 rounded-lg bg-gold/15 px-4 py-3 text-sm text-ink">
          Connected {searchParams.connected} successfully.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded-lg bg-error-soft px-4 py-3 text-sm text-error">
          Couldn’t connect: {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {PLATFORMS.map((p) => {
          const connected = connectedByPlatform.get(p.id);
          const configured = isConfigured(p.id);
          return (
            <Card key={p.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg text-navy">{p.label}</h3>
                    {connected ? (
                      <Badge>Connected</Badge>
                    ) : configured ? null : (
                      <Badge>Coming soon</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{p.blurb}</p>
                  {connected && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {connected.account_label ?? "Account linked"}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {connected ? (
                    <a
                      href={`/api/social/connect/${p.id}`}
                      className="text-sm text-gold-deep underline"
                    >
                      Reconnect
                    </a>
                  ) : configured ? (
                    <a
                      href={`/api/social/connect/${p.id}`}
                      className="inline-flex h-9 items-center rounded-full bg-gold px-4 text-sm font-medium text-navy-900 hover:bg-gold-soft"
                    >
                      Connect
                    </a>
                  ) : (
                    <span className="text-xs text-ink-muted">Pending approval</span>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
