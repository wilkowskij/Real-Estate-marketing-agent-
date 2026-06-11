"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Label, Input } from "@/components/ui/Field";

export function AuthForm({
  mode,
  inviteToken,
}: {
  mode: "login" | "signup";
  /** When present, redirect to the invite page after auth so the join completes. */
  inviteToken?: string;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Where to land after successful auth.
  const postAuthPath = inviteToken ? `/invite/${inviteToken}` : "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(postAuthPath)}`,
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(postAuthPath);
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-gold/10 p-4 text-sm text-ink-soft">
        <p className="font-semibold text-navy">Check your inbox 📬</p>
        <p className="mt-1">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Click it and you&apos;ll be taken straight into your studio.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
      )}
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
        {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
