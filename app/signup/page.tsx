import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui/Card";

// Renders at request time so the browser Supabase client reads runtime env vars
// instead of being instantiated during the static build (where they're absent).
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-display text-3xl text-paper">
          Marquee
        </Link>
        <Card>
          <CardBody className="space-y-6">
            <div>
              <h1 className="text-2xl text-navy">Start your studio</h1>
              <p className="mt-1 text-sm text-ink-muted">
                A solo workspace is created for you automatically — invite a team
                anytime.
              </p>
            </div>
            <AuthForm mode="signup" />
            <p className="text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-gold-deep underline">
                Sign in
              </Link>
            </p>
            <p className="text-center text-xs text-ink-muted/70">
              By signing up you agree to our{" "}
              <Link href="/terms" className="underline hover:text-ink-muted">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-ink-muted">
                Privacy Policy
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
