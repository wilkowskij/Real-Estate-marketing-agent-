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
];

/**
 * Connections settings — Buffer-style "connect an account" hub. Org admins click
 * Connect, authorize once, and we store the token. Platforms whose OAuth app
 * isn't configured yet show as "Coming soon" (manual export still works).
 */
export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const ctx = await getOrgContext();
  const supabase = createSupabaseServerClient();
  const { data: accounts } = ctx
    ? await supabase
        .from("social_accounts")
        .select("id, platform, account_label, created_at")
        .eq("org_id", ctx.orgId)
    : { data: [] as any[] };

  const connectedByPlatform = new Map((accounts ?? []).map((a) => [a.platform, a]));
  const canManage = ctx?.role === "owner" || ctx?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-4xl text-navy">Connected accounts</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Connect a social account once and publish straight from your studio — no
        copy-paste. Until a platform is approved, finished posts download for you
        to post by hand.
      </p>

      {searchParams.connected && (
        <p className="mt-4 rounded-lg bg-gold/15 px-4 py-3 text-sm text-ink">
          Connected {searchParams.connected} successfully.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
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
                  {!canManage ? (
                    <span className="text-xs text-ink-muted">Admins only</span>
                  ) : connected ? (
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
