import { SectionTabs } from "@/components/SectionTabs";

const TABS = [
  { href: "/company", label: "Agents" },
  { href: "/company/connections", label: "Connections" },
  { href: "/company/brand", label: "Brand & documents" },
  { href: "/company/subscription", label: "Subscription" },
];

/**
 * Company profile hub — the org-level home for managing agents, the company
 * brand kit + uploaded brand documents, and the subscription/payment plan.
 */
export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Company profile</p>
      <h1 className="mt-2 text-4xl text-navy">Your brokerage HQ</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Manage your agents, the company brand and documents every post is built
        from, and your subscription — all in one place.
      </p>
      <SectionTabs tabs={TABS} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
