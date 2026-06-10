import { AppShell } from "@/components/AppShell";
import { getOrgContext } from "@/lib/org";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  return <AppShell area={ctx?.orgArea}>{children}</AppShell>;
}
