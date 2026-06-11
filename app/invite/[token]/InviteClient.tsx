"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * White-labeled invite page rendered client-side so we can check auth state
 * and handle the join action without a full page reload.
 */
export function InviteClient({
  token,
  orgName,
  logoUrl,
  brandColor,
  role,
}: {
  token: string;
  orgName: string;
  logoUrl: string | null;
  brandColor: string;
  role: "member" | "admin";
}) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the visitor is already signed in.
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
    });
  }, []);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not join.");
      // Redirect to the dashboard — the org context will pick up the new membership.
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-6">
      {/* Warm glow matching the login page. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, ${brandColor}30, transparent 70%)`,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Org branding */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="max-h-14 w-auto object-contain" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lift"
              style={{ background: brandColor }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-3xl text-paper">{orgName}</h1>
          <p className="text-sm text-paper/60">
            You&apos;ve been invited to join as {role === "admin" ? "an admin" : "an agent"}.
          </p>
        </div>

        {/* Action card */}
        <div className="rounded-2xl bg-white p-8 shadow-lift">
          {authed === null ? (
            <p className="text-center text-sm text-ink-muted">Loading…</p>
          ) : authed ? (
            /* Signed-in: one-click join */
            <div className="space-y-4 text-center">
              <p className="text-ink">
                You&apos;re signed in. Click below to join <strong>{orgName}</strong> and open
                your dashboard.
              </p>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                onClick={join}
                disabled={joining}
                className="w-full rounded-full py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: brandColor }}
              >
                {joining ? "Joining…" : `Join ${orgName}`}
              </button>
              <p className="text-xs text-ink-muted">
                Not your account?{" "}
                <button
                  onClick={async () => {
                    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
                    setAuthed(false);
                  }}
                  className="underline hover:text-ink"
                >
                  Sign out
                </button>
              </p>
            </div>
          ) : (
            /* Not signed in: show sign-up / sign-in options */
            <div className="space-y-4 text-center">
              <p className="text-ink">
                Create a free account to join <strong>{orgName}</strong> — you&apos;ll land
                straight in your team dashboard.
              </p>
              <Link
                href={`/signup?invite=${token}`}
                className="block w-full rounded-full py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
                style={{ background: brandColor }}
              >
                Create an account
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-paper-line" />
                <span className="text-xs text-ink-muted">or</span>
                <div className="h-px flex-1 bg-paper-line" />
              </div>
              <Link
                href={`/login?invite=${token}`}
                className="block w-full rounded-full border border-paper-line py-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                Sign in to an existing account
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-paper/40">
          Powered by{" "}
          <Link href="/" className="hover:text-paper/60">
            Marquee
          </Link>
        </p>
      </div>
    </div>
  );
}
