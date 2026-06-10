import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "📸" },
  { key: "facebook", label: "Facebook", icon: "👍" },
  { key: "linkedin", label: "LinkedIn", icon: "💼" },
  { key: "twitter", label: "X", icon: "𝕏" },
] as const;

/** social_accounts stores X as "twitter"; tolerate "x" too. */
function normPlatform(p: string): string {
  return p === "x" ? "twitter" : p;
}

/**
 * Company → Connections. Brokerage-wide social coverage: which agent has
 * connected which platform, where the gaps are, plus any company-owned
 * accounts. Read-only — connecting is per-person (each agent does it from their
 * own Profile → Connections), so this view surfaces coverage and nudges gaps.
 */
export default async function CompanyConnectionsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const supabase = createSupabaseServerClient();

  const [{ data: memberships }, { data: accounts }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, user_id")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("social_accounts")
      .select("platform, owner, membership_id, account_label")
      .eq("org_id", ctx.orgId),
  ]);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
    : { data: [] };
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

  // membershipId -> { platform -> label }
  const memberAccounts = new Map<string, Map<string, string | null>>();
  // company-owned accounts: platform -> label
  const orgAccounts = new Map<string, string | null>();
  for (const a of accounts ?? []) {
    const platform = normPlatform(a.platform as string);
    if (a.owner === "org" || !a.membership_id) {
      orgAccounts.set(platform, a.account_label ?? null);
    } else {
      if (!memberAccounts.has(a.membership_id)) memberAccounts.set(a.membership_id, new Map());
      memberAccounts.get(a.membership_id)!.set(platform, a.account_label ?? null);
    }
  }

  const agents = (memberships ?? []).map((m) => ({
    membershipId: m.id,
    role: m.role,
    name: nameByUser.get(m.user_id) || "Unnamed agent",
    isYou: m.user_id === ctx.userId,
    connected: memberAccounts.get(m.id) ?? new Map<string, string | null>(),
  }));

  const totalAgents = agents.length || 1;
  const coverage = PLATFORMS.map((p) => {
    const n = agents.filter((a) => a.connected.has(p.key)).length;
    return { ...p, n, pct: Math.round((n / totalAgents) * 100) };
  });

  return (
    <div>
      <h2 className="text-2xl text-navy">Connections</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Who on your team has connected which platforms. Connecting is per-agent —
        each agent links their own accounts from{" "}
        <Link href="/profile/connections" className="text-gold-deep hover:underline">
          Profile → Connections
        </Link>
        .
      </p>

      {/* Coverage summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {coverage.map((c) => (
          <Card key={c.key}>
            <CardBody>
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
              <p className="mt-1 font-display text-2xl text-navy">
                {c.n}/{totalAgents}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-paper">
                <div className="h-full rounded-full bg-gold" style={{ width: `${c.pct}%` }} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Company-owned accounts */}
      {orgAccounts.size > 0 && (
        <div className="mt-6">
          <p className="eyebrow mb-2">Company accounts</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.filter((p) => orgAccounts.has(p.key)).map((p) => (
              <Badge key={p.key}>
                {p.icon} {p.label}
                {orgAccounts.get(p.key) ? ` · ${orgAccounts.get(p.key)}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Per-agent matrix */}
      <Card className="mt-6 overflow-hidden">
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line bg-paper/60">
                <th className="px-4 py-3 text-left font-semibold text-ink">Agent</th>
                {PLATFORMS.map((p) => (
                  <th key={p.key} className="px-3 py-3 text-center font-semibold text-ink-soft">
                    <span className="mr-1">{p.icon}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.membershipId} className="border-b border-paper-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{a.name}</span>
                    {a.isYou && <span className="ml-1 text-xs text-ink-muted">(you)</span>}
                    <span className="ml-2 text-xs capitalize text-ink-muted">{a.role}</span>
                  </td>
                  {PLATFORMS.map((p) => {
                    const has = a.connected.has(p.key);
                    const label = a.connected.get(p.key);
                    return (
                      <td key={p.key} className="px-3 py-3 text-center">
                        {has ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold-deep"
                            title={label ?? undefined}
                          >
                            ✓<span className="hidden md:inline">{label ? ` ${label}` : ""}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <p className="mt-3 text-xs text-ink-muted">
        ✓ = connected · — = not connected yet. Live posting to a platform also
        depends on that platform&apos;s app review.
      </p>
    </div>
  );
}
