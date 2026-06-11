"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SupportWidget } from "@/components/support/SupportWidget";
import { useModalDismiss } from "@/lib/useModalDismiss";
import type { PlanId } from "@/lib/billing/plans";

export interface ShellSubscription {
  plan: PlanId;
  trialing: boolean;
  trialEndsAt: string | null;
  active: boolean;
}

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

/** Classes for content that's always shown when pinned, else fades in on expand. */
function reveal(pinned: boolean): string {
  return pinned
    ? ""
    : "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100";
}

/** Pin glyph — outline when unpinned, filled when docked open. */
function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2.5h1l.6 4.2 2.4 2.1v1.2H6v-1.2l2.4-2.1.6-4.2z" strokeLinejoin="round" />
      <path d="M10 10v5" strokeLinecap="round" />
    </svg>
  );
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
  subscription,
  creditsRemaining,
}: {
  children: React.ReactNode;
  brand?: ShellBrand;
  areaLabel?: string;
  subscription?: ShellSubscription;
  creditsRemaining?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop: keep the sidebar docked open. Persisted across sessions; starts
  // false on the server and hydrates from localStorage to avoid a mismatch.
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(window.localStorage.getItem("sidebarPinned") === "1");
  }, []);

  function togglePinned() {
    setPinned((p) => {
      const next = !p;
      window.localStorage.setItem("sidebarPinned", next ? "1" : "0");
      return next;
    });
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const drawerRef = useModalDismiss<HTMLElement>(menuOpen, () => setMenuOpen(false));

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  const marketLabel = areaLabel ?? "Your Market";

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar: an icon rail that expands on hover / keyboard focus,
          or stays docked open when pinned. The spacer reserves the current
          width so a hover-expand overlays content (flyout) while a pinned rail
          pushes it. */}
      <div className={cn("hidden shrink-0 md:block", pinned ? "md:w-64" : "md:w-[4.75rem]")} aria-hidden />
      <aside
        className={cn(
          "group fixed left-0 top-0 z-30 hidden h-screen flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-navy to-navy-900 py-6 transition-[width,box-shadow] duration-200 ease-out md:flex",
          pinned ? "w-64" : "w-[4.75rem] hover:w-64 hover:shadow-lift focus-within:w-64"
        )}
      >
        {/* `reveal`: visible when pinned, otherwise fades in as the rail expands. */}
        <div className="flex items-center gap-2 px-4">
          <Brandmark brand={brand} />
          <span className={cn("min-w-0 flex-1", reveal(pinned))}>
            <Wordmark brand={brand} variant="dark" className="text-xl text-paper" />
          </span>
          <button
            onClick={togglePinned}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            className={cn(
              "shrink-0 rounded-lg p-1.5 text-paper/60 transition-colors hover:bg-white/10 hover:text-paper",
              reveal(pinned)
            )}
          >
            <PinIcon filled={pinned} />
          </button>
        </div>
        <div className="mt-8 px-3">
          <NavLinks pathname={pathname} collapsible={!pinned} />
        </div>
        <div className={cn("mt-auto px-3 space-y-2", reveal(pinned))}>
          <SubscriptionWidget subscription={subscription} creditsRemaining={creditsRemaining} />
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

/**
 * Sidebar widget showing trial countdown or monthly credit usage. Only renders
 * when the sidebar is expanded (parent applies the reveal() fade-in class).
 */
function SubscriptionWidget({
  subscription,
  creditsRemaining,
}: {
  subscription?: ShellSubscription;
  creditsRemaining?: number | null;
}) {
  if (!subscription) return null;

  // During trial: show days remaining + progress bar.
  if (subscription.trialing && subscription.trialEndsAt) {
    const msLeft = new Date(subscription.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const pct = Math.round((daysLeft / 14) * 100);
    const urgent = daysLeft <= 3;
    return (
      <div className={`rounded-xl p-3 text-xs ${urgent ? "bg-error/15" : "bg-white/5"}`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold whitespace-nowrap ${urgent ? "text-error-soft" : "text-paper/80"}`}>
            {daysLeft === 0 ? "Trial ended" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in trial`}
          </span>
          <Link
            href="/company/subscription"
            className="ml-2 whitespace-nowrap rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-navy hover:bg-gold-soft"
          >
            Upgrade
          </Link>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${urgent ? "bg-error-soft" : "bg-gold"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // Paid or free plan: show credits used this month.
  if (creditsRemaining == null) return null; // unlimited — nothing to show
  const { plan } = subscription;
  // Mirror the effective limit shown in the UI (free = 5, solo = 40, etc.)
  const LIMITS: Record<string, number> = { free: 5, solo: 40, team: 400, brokerage: 1200 };
  const limit = LIMITS[plan] ?? 40;
  const used = limit - creditsRemaining;
  const pct = Math.round((used / limit) * 100);
  const low = creditsRemaining <= 3;

  return (
    <div className={`rounded-xl p-3 text-xs ${low ? "bg-error/15" : "bg-white/5"}`}>
      <div className="flex items-center justify-between">
        <span className={`whitespace-nowrap font-semibold ${low ? "text-error-soft" : "text-paper/80"}`}>
          {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} left
        </span>
        {(low || plan === "free") && (
          <Link
            href="/company/subscription"
            className="ml-2 whitespace-nowrap rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-navy hover:bg-gold-soft"
          >
            Upgrade
          </Link>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-error-soft" : "bg-gold/70"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1 whitespace-nowrap text-paper/40">{used} of {limit} used this month</p>
    </div>
  );
}
