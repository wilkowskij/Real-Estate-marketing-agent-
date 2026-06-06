import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui/Card";

// Renders at request time so the browser Supabase client reads runtime env vars
// instead of being instantiated during the static build (where they're absent).
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : undefined;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6">
      {/* Warm radial glow so the page feels luxe, not stark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(201,169,110,0.18), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-display text-3xl text-paper">
          Marquee
        </Link>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-editorial text-gold-soft">
          Elevate your listings
        </p>
        <Card>
          <CardBody className="space-y-6">
            <div>
              <h1 className="text-2xl text-navy">Welcome back</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Sign in to your marketing studio.
              </p>
            </div>
            <AuthForm mode="login" next={next} />
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
