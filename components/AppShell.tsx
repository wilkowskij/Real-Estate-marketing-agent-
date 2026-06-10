"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Studio", icon: "◆" },
  { href: "/generate", label: "Create", icon: "✦" },
  { href: "/campaigns", label: "Campaigns", icon: "❖" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/library", label: "Library", icon: "▣" },
  { href: "/company", label: "Company", icon: "⬡" },
  { href: "/profile", label: "Profile", icon: "◈" },
];

function NavItems({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
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
    </>
  );
}

export function AppShell({
  children,
  area,
}: {
  children: React.ReactNode;
  area?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  const marketLabel = area ?? "Your Market";

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-paper-line bg-navy px-5 py-7 md:flex">
        <span className="px-2 font-display text-2xl text-paper">Marquee</span>
        <nav className="mt-10 flex flex-col gap-1">
          <NavItems pathname={pathname} />
        </nav>
        <div className="mt-auto rounded-lg bg-white/5 p-4 text-xs text-paper/60">
          <p className="font-semibold text-paper/80">{marketLabel}</p>
          <p className="mt-1">Your local marketing specialist is on call.</p>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col bg-navy px-5 py-7 transition-transform duration-200 md:hidden",
          mobileOpen ? "flex translate-x-0" : "hidden -translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl text-paper">Marquee</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-paper/60 hover:text-paper"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          <NavItems pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </nav>
        <div className="mt-auto rounded-lg bg-white/5 p-4 text-xs text-paper/60">
          <p className="font-semibold text-paper/80">{marketLabel}</p>
          <p className="mt-1">Your local marketing specialist is on call.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper-line bg-paper-card/80 px-6 py-4 backdrop-blur md:px-8">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect y="3" width="20" height="2" rx="1" />
                <rect y="9" width="20" height="2" rx="1" />
                <rect y="15" width="20" height="2" rx="1" />
              </svg>
            </button>
            <span className="font-display text-xl text-navy">Marquee</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:block">Welcome back</span>
            <Link href="/profile" aria-label="Your profile">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
            </Link>
            <button
              onClick={signOut}
              className="rounded-full border border-paper-line px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
