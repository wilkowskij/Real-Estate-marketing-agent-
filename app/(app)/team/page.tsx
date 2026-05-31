import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamClient, type TeamMember } from "./TeamClient";

export const dynamic = "force-dynamic";

/**
 * Team / org management. Owners & admins invite agents, set roles, and lock
 * brand fields so the whole brokerage stays on-brand. A solo account is an
 * org-of-one and still renders (just one owner row).
 */
export default async function TeamPage() {
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
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Team</p>
      <h1 className="mt-2 text-4xl text-navy">Your brokerage, on brand.</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Invite agents and decide which brand elements they can personalize and
        which stay locked to the company standard.
      </p>

      <TeamClient
        members={members}
        currentUserId={ctx.userId}
        isAdmin={isAdmin}
        lockedFields={ctx.orgKit.locked_fields ?? []}
      />
    </div>
  );
}
