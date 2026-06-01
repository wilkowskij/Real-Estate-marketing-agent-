"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Studio", icon: "◆" },
  { href: "/generate", label: "Create", icon: "✦" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/brand", label: "Brand kit", icon: "❖" },
  { href: "/library", label: "Library", icon: "▣" },
  { href: "/team", label: "Team", icon: "⬡" },
  { href: "/settings/connections", label: "Connections", icon: "⚯" },
  { href: "/settings/billing", label: "Billing", icon: "◇" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-paper-line bg-navy px-5 py-7 md:flex">
        <span className="px-2 font-display text-2xl text-paper">Marquee</span>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "border-l-2 border-gold bg-gold/25 font-medium text-paper"
                    : "border-l-2 border-transparent text-paper/70 hover:bg-white/5 hover:text-paper"
                )}
              >
                <span className="w-4 text-center opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg bg-white/5 p-4 text-xs text-paper/60">
          <p className="font-semibold text-paper/80">Monmouth County</p>
          <p className="mt-1">Your local marketing specialist is on call.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper-line bg-paper-card/80 px-8 py-4 backdrop-blur">
          <div className="md:hidden font-display text-xl text-navy">Marquee</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:block">
              Welcome back
            </span>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
