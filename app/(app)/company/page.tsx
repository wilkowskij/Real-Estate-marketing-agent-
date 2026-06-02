import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamClient, type TeamMember } from "@/components/team/TeamClient";

export const dynamic = "force-dynamic";

/**
 * Company → Agents. Owners & admins invite agents, set roles, and lock brand
 * fields so the whole brokerage stays on-brand. A solo account is an org-of-one
 * and still renders (just one owner row).
 */
export default async function CompanyAgentsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const isAdmin = ctx.role === "owner" || ctx.role === "admin";

  // No FK join helper, so load memberships then their profiles and map together.
  const supabase = createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, role, user_id")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: true });

  const userIds = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
    : { data: [] };

  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  const members: TeamMember[] = (memberships ?? []).map((m) => ({
    membershipId: m.id,
    userId: m.user_id,
    role: m.role,
    fullName: nameByUser.get(m.user_id) ?? null,
  }));

  return (
    <div>
      <h2 className="text-2xl text-navy">Agents</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Invite agents and decide which brand elements they can personalize and
        which stay locked to the company standard.
      </p>
      <div className="mt-6">
        <TeamClient
          members={members}
          currentUserId={ctx.userId}
          isAdmin={isAdmin}
          lockedFields={ctx.orgKit.locked_fields ?? []}
        />
      </div>
    </div>
  );
}
