"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SupportWidget } from "@/components/support/SupportWidget";
import { useModalDismiss } from "@/lib/useModalDismiss";

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
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}

/**
 * The product wordmark, or the org's logo/name when white-labeled. `variant`
 * picks the legible logo for the surface: "dark" for the navy sidebar/drawer,
 * "light" for the light mobile header. Falls back to the brand name, then to
 * the product wordmark.
 */
function Wordmark({
  brand,
  variant,
  className,
}: {
  brand?: ShellBrand;
  variant: "dark" | "light";
  className?: string;
}) {
  const logo = brand ? (variant === "dark" ? brand.logoDarkUrl : brand.logoLightUrl) : null;
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={brand!.name} className={cn("max-h-8 w-auto object-contain", className)} />;
  }
  return <span className={cn("font-display text-2xl", className)}>{brand?.name ?? "Marquee"}</span>;
}

/** Compact brand tile shown collapsed; pairs with the wordmark when expanded. */
function Brandmark({ brand }: { brand?: ShellBrand }) {
  const initial = (brand?.name ?? "Marquee").trim().charAt(0).toUpperCase() || "M";
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-deep font-display text-lg text-navy shadow-soft">
      {brand ? initial : "✦"}
    </span>
  );
}

/**
 * Shared nav link list. `collapsible` (the desktop rail) keeps icons visible and
 * fades labels in only when the rail expands; the mobile drawer always shows them.
 */
function NavLinks({
  pathname,
  onNavigate,
  collapsible,
}: {
  pathname: string | null;
  onNavigate?: () => void;
  collapsible?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            title={collapsible ? item.label : undefined}
            className={cn(
              "flex items-center rounded-xl px-2 py-2 text-sm transition-colors",
              active
                ? "bg-gradient-to-r from-gold/30 to-gold/5 font-medium text-paper"
                : "text-paper/60 hover:bg-white/5 hover:text-paper"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px] transition-colors",
                active ? "text-gold-soft" : "opacity-80"
              )}
            >
              {item.icon}
            </span>
            <span
              className={cn(
                "ml-1 whitespace-nowrap",
                collapsible && "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  brand,
  areaLabel,
}: {
  children: React.ReactNode;
  brand?: ShellBrand;
  areaLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const drawerRef = useModalDismiss<HTMLElement>(menuOpen, () => setMenuOpen(false));

  async function signOut() {
    // Clear the session everywhere (also wipes the local refresh token), then
    // send the user to login with a fresh slate.
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar: an icon rail that expands on hover / keyboard focus.
          The spacer reserves the collapsed width so the expanded rail overlays
          content (a flyout) instead of pushing it. */}
      <div className="hidden shrink-0 md:block md:w-[4.75rem]" aria-hidden />
      <aside className="group fixed left-0 top-0 z-30 hidden h-screen w-[4.75rem] flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-navy to-navy-900 py-6 transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-lift focus-within:w-64 md:flex">
        <div className="flex items-center gap-3 px-4">
          <Brandmark brand={brand} />
          <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <Wordmark brand={brand} variant="dark" className="text-xl text-paper" />
          </span>
        </div>
        <div className="mt-8 px-3">
          <NavLinks pathname={pathname} collapsible />
        </div>
        <div className="mt-auto px-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="rounded-xl bg-white/5 p-3 text-xs text-paper/60">
            <p className="whitespace-nowrap font-semibold text-paper/80">{areaLabel ?? "Monmouth County, NJ"}</p>
            <p className="mt-1.5 whitespace-nowrap text-paper/40">Powered by Claude Opus 4.8 + OpenAI</p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu" className="absolute left-0 top-0 flex h-full w-64 flex-col rounded-r-2xl border-r border-white/5 bg-gradient-to-b from-navy to-navy-900 px-4 py-7 shadow-lift">
            <div className="flex items-center justify-between px-2">
              <Wordmark brand={brand} variant="dark" className="text-paper" />
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
              <Wordmark brand={brand} variant="light" className="text-xl text-navy" />
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
