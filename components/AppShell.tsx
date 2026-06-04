"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SupportWidget } from "@/components/support/SupportWidget";

const NAV = [
  { href: "/dashboard", label: "Studio", icon: "◆" },
  { href: "/generate", label: "Create", icon: "✦" },
  { href: "/campaigns", label: "Campaigns", icon: "❖" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/analytics", label: "Analytics", icon: "▤" },
  { href: "/leads", label: "Leads", icon: "✸" },
  { href: "/library", label: "Library", icon: "▣" },
  { href: "/company", label: "Company", icon: "⬡" },
  { href: "/profile", label: "Profile", icon: "◈" },
];

/** White-label theming passed from the server layout (undefined = default). */
export interface ShellBrand {
  name: string;
  logoUrl: string | null;
  accent: string | null;
  areaLabel: string;
}

/** The product wordmark, or the org's logo/name when white-labeled. */
function Wordmark({ brand, className }: { brand?: ShellBrand; className?: string }) {
  if (brand?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoUrl} alt={brand.name} className={cn("max-h-8 w-auto object-contain", className)} />;
  }
  if (brand) {
    return (
      <span className={cn("font-display text-2xl", className)} style={{ color: brand.accent ?? undefined }}>
        {brand.name}
      </span>
    );
  }
  return <span className={cn("font-display text-2xl", className)}>Marquee</span>;
}

/** Shared nav link list — rendered in both the desktop sidebar and mobile drawer. */
function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
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
    </nav>
  );
}

export function AppShell({ children, brand }: { children: React.ReactNode; brand?: ShellBrand }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function signOut() {
    // Clear the session everywhere (also wipes the local refresh token), then
    // send the user to login with a fresh slate.
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-paper-line bg-navy px-5 py-7 md:flex">
        <div className="px-2">
          <Wordmark brand={brand} className="text-paper" />
        </div>
        <div className="mt-10">
          <NavLinks pathname={pathname} />
        </div>
        <div className="mt-auto rounded-lg bg-white/5 p-4 text-xs text-paper/60">
          <p className="font-semibold text-paper/80">{brand?.areaLabel ?? "Monmouth County, NJ"}</p>
          <p className="mt-1">Your local marketing specialist is on call.</p>
          {brand && <p className="mt-2 text-paper/40">Powered by Marquee</p>}
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-paper-line bg-navy px-5 py-7">
            <div className="flex items-center justify-between px-2">
              <Wordmark brand={brand} className="text-paper" />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1 text-paper/70 hover:bg-white/10 hover:text-paper"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="mt-8">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <button
              onClick={signOut}
              className="mt-auto rounded-lg border border-white/10 px-3 py-2.5 text-sm text-paper/70 transition-colors hover:bg-white/5 hover:text-paper"
            >
              Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper-line bg-paper-card/80 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-paper-line p-2 text-ink-soft hover:bg-paper hover:text-ink md:hidden"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M2.5 5.5A.75.75 0 013.25 4.75h13.5a.75.75 0 010 1.5H3.25A.75.75 0 012.5 5.5zm0 4.5a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.25A.75.75 0 012.5 10zm.75 3.75a.75.75 0 000 1.5h13.5a.75.75 0 000-1.5H3.25z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="md:hidden">
              <Wordmark brand={brand} className="text-xl text-navy" />
            </div>
          </div>
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
        <main className="flex flex-1 flex-col">
          <div className="flex-1 p-5 md:p-8">{children}</div>
          <SupportWidget />
        </main>
      </div>
    </div>
  );
}
