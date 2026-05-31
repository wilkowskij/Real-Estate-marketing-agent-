import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui/Card";

// Renders at request time so the browser Supabase client reads runtime env vars
// instead of being instantiated during the static build (where they're absent).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-display text-3xl text-paper">
          Marquee
        </Link>
        <Card>
          <CardBody className="space-y-6">
            <div>
              <h1 className="text-2xl text-navy">Welcome back</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Sign in to your marketing studio.
              </p>
            </div>
            <AuthForm mode="login" />
            <p className="text-center text-sm text-ink-muted">
              New here?{" "}
              <Link href="/signup" className="text-gold-deep underline">
                Create an account
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
