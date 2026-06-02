import { SectionTabs } from "@/components/SectionTabs";

const TABS = [
  { href: "/profile", label: "My details" },
  { href: "/profile/connections", label: "Connections" },
];

/**
 * User profile hub — the individual agent's home for their personal details
 * (headshot, name, license, contact) and their own connected social accounts.
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Your profile</p>
      <h1 className="mt-2 text-4xl text-navy">Your agent profile</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Your headshot, license, and contact details appear on the graphics you
        create. Connect your own social accounts to publish straight from here.
      </p>
      <SectionTabs tabs={TABS} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
