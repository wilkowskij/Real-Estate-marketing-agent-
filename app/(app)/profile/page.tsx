import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const dynamic = "force-dynamic";

/**
 * Profile → My details. The individual agent's personal profile (headshot,
 * name, license, contact) that layers over the company brand on every graphic.
 */
export default async function ProfilePage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const supabase = createSupabaseServerClient();
  const headshotUrl = await signedUrl(supabase, ctx.brand.agent.headshotPath);

  return <ProfileClient brand={ctx.brand} headshotUrl={headshotUrl} />;
}
