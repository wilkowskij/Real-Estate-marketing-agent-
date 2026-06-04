"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useModalDismiss } from "@/lib/useModalDismiss";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import type { FeedbackType } from "@/lib/supabase/types";

const TYPES: { value: FeedbackType; label: string; hint: string }[] = [
  { value: "bug", label: "Report a problem", hint: "Something is broken or not working as expected." },
  { value: "feedback", label: "Share feedback", hint: "Tell us what's working or what could be better." },
  { value: "feature", label: "Request a feature", hint: "Suggest something new you'd like us to build." },
];

/**
 * In-app support + feedback entry point. Renders a small footer link that opens
 * a modal; submissions POST to /api/feedback (stored + mirrored to Notion for
 * the team to triage). Rendered once in the app shell so it's on every page.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useModalDismiss(open, () => close());

  function reset() {
    setType("feedback");
    setSubject("");
    setMessage("");
    setContactEmail("");
    setError(null);
    setDone(false);
  }

  function close() {
    setOpen(false);
    // Let the modal finish closing before clearing, so it doesn't flicker.
    setTimeout(reset, 200);
  }

  async function submit() {
    if (subject.trim().length < 1 || message.trim().length < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject: subject.trim(),
          message: message.trim(),
          contactEmail: contactEmail.trim() || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : pathname ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not send");
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const activeHint = TYPES.find((t) => t.value === type)?.hint;

  return (
    <>
      <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-paper-line px-5 py-5 md:px-8">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Need help or have an idea? Send support &amp; feedback
        </button>
        <Link
          href="/feedback"
          className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          View your requests
        </Link>
      </footer>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={close} />
          <div role="dialog" aria-modal="true" className="relative z-50 w-full max-w-md rounded-xl2 border border-paper-line bg-white p-6 shadow-xl">
            {done ? (
              <div className="text-center">
                <h2 className="font-display text-xl text-navy">Thank you</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  Your message is in. We review every submission and prioritize what to build next.
                  Track its status under{" "}
                  <Link href="/feedback" onClick={close} className="text-gold-deep underline underline-offset-2">
                    Your requests
                  </Link>
                  .
                </p>
                <div className="mt-5 flex justify-center">
                  <Button variant="gold" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl text-navy">Support &amp; feedback</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Report an issue, share feedback, or request a feature — it goes straight to our team.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <Label>What's this about?</Label>
                    <Select value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                    {activeHint && <p className="mt-1 text-xs text-ink-muted">{activeHint}</p>}
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Short summary"
                      autoFocus
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What happened, or what would you like to see? Steps to reproduce help for bugs."
                      maxLength={5000}
                    />
                  </div>
                  <div>
                    <Label>Reply-to email (optional)</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={200}
                    />
                  </div>
                  {error && <p className="text-sm text-error">{error}</p>}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={close} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    onClick={submit}
                    disabled={busy || subject.trim().length < 1 || message.trim().length < 1}
                  >
                    {busy ? "Sending…" : "Send"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
