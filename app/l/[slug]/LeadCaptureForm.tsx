"use client";

import { useState } from "react";

/** Public capture form. Posts to /api/leads/capture; no auth required. */
export function LeadCaptureForm({ slug, openHouse }: { slug: string; openHouse: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, phone, message, company }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit. Please try again.");
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20";

  if (done) {
    return (
      <div className="mt-6 rounded-lg bg-gold/10 p-5 text-center">
        <p className="font-display text-lg text-navy">Thank you!</p>
        <p className="mt-1 text-sm text-ink-soft">
          {openHouse ? "You're signed in. " : ""}We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        className={field}
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />
      <input
        className={field}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        className={field}
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
      />
      <textarea
        className={field}
        rows={3}
        placeholder={openHouse ? "Anything you're looking for? (optional)" : "How can we help? (optional)"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={busy || (!email && !phone)}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-bold uppercase tracking-editorial text-navy-900 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Sending…" : openHouse ? "Sign in" : "Send"}
      </button>
      <p className="text-center text-[11px] text-ink-muted">
        We&apos;ll only use this to follow up about real estate.
      </p>
    </form>
  );
}
