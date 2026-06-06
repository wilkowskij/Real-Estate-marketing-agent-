"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface InviteDetails {
  orgName: string;
  logoUrl: string | null;
  role: string;
  email: string;
  expiresAt: string;
}

/**
 * Branded acceptance card shown to the invited agent.
 * Displayed for both authenticated (shows Accept button) and
 * unauthenticated (shows Sign In link) states.
 */
export function InviteAcceptClient({
  token,
  invite,
  isAuthenticated,
  loginNext,
}: {
  token: string;
  invite: InviteDetails;
  isAuthenticated: boolean;
  loginNext: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to accept invitation.");
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const roleLabel = invite.role === "admin" ? "Admin" : "Agent";
  const expiry = new Date(invite.expiresAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(201,169,110,0.18), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Company logo / name */}
        <div className="mb-8 flex flex-col items-center gap-4">
          {invite.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={invite.logoUrl}
              alt={invite.orgName}
              className="h-14 max-w-[200px] object-contain"
            />
          ) : (
            <span className="font-display text-3xl text-paper">{invite.orgName}</span>
          )}
        </div>

        {/* Invitation card */}
        <div className="rounded-2xl border border-paper-line bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-editorial text-gold-deep">
              You&apos;re invited
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-navy">
              Join {invite.orgName}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              as a{roleLabel === "Admin" ? "n" : ""}{" "}
              <span className="font-medium text-ink">{roleLabel}</span>
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-paper-line bg-paper px-4 py-3 text-sm text-ink-muted">
            Invitation sent to{" "}
            <span className="font-medium text-ink">{invite.email}</span>
            <br />
            <span className="text-xs">Expires {expiry}</span>
          </div>

          {isAuthenticated ? (
            <div className="mt-6">
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={accept}
                disabled={busy}
              >
                {busy ? "Joining…" : `Accept & Join ${invite.orgName}`}
              </Button>
              {error && <p className="mt-3 text-sm text-error">{error}</p>}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-center text-sm text-ink-muted">
                Sign in to accept this invitation.
              </p>
              <Link href={loginNext}>
                <Button variant="gold" size="lg" className="w-full">
                  Sign in to accept
                </Button>
              </Link>
              <p className="text-center text-sm text-ink-muted">
                No account yet?{" "}
                <Link
                  href={`/signup`}
                  className="text-gold-deep underline"
                >
                  Create one
                </Link>{" "}
                — you&apos;ll be added automatically after confirming your email.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/** Shown when the invitation token is invalid, expired, or already used. */
export function InviteErrorCard({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md rounded-2xl border border-paper-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-navy">Invitation unavailable</h1>
        <p className="mt-3 text-sm text-ink-muted">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white"
        >
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
