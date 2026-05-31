import Link from "next/link";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    k: "01",
    title: "Just Sold & New Listing",
    body: "Upload photos and get a finished, on-brand graphic plus caption and hashtags in seconds.",
  },
  {
    k: "02",
    title: "A local marketing mind",
    body: "Copy written by a specialist in New Jersey & Monmouth County — Red Bank to the shore.",
  },
  {
    k: "03",
    title: "Your brand, always",
    body: "Company or solo: lock your logo, colors, and type so every post looks unmistakably yours.",
  },
  {
    k: "04",
    title: "On autopilot",
    body: "Recurring local-market posts and tasteful takes on trends — queued for your review.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl tracking-tight text-navy">
          Marquee
        </span>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow mb-5">New Jersey · Monmouth County</p>
            <h1 className="text-5xl leading-[1.05] text-navy md:text-6xl">
              Marketing that looks like you hired an agency.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">
              Drop in your listing photos. Marquee&apos;s marketing, design, and
              strategy agents turn them into ready-to-publish social content —
              perfectly on brand, every time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" variant="gold">Start free</Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="secondary">See an example</Button>
              </Link>
            </div>
          </div>

          {/* Hero showpiece */}
          <div className="relative">
            <div className="rotate-[2deg] rounded-xl2 bg-navy p-3 shadow-lift">
              <div className="aspect-[4/5] rounded-lg bg-gradient-to-br from-navy-700 to-navy-900 p-6 flex flex-col justify-between">
                <span className="inline-flex w-fit items-center rounded-full bg-gold px-4 py-1.5 text-xs font-bold uppercase tracking-editorial text-navy-900">
                  Just Sold
                </span>
                <div>
                  <p className="font-display text-3xl text-paper">
                    14 Riverside Ave
                  </p>
                  <p className="mt-1 text-sm text-paper/70">
                    Red Bank · 4 BD · 3 BA
                  </p>
                  <p className="mt-3 font-display text-2xl text-gold-soft">
                    $1,250,000
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px overflow-hidden rounded-xl2 border border-paper-line bg-paper-line md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.k} className="bg-paper-card p-8">
              <span className="font-display text-sm text-gold">{f.k}</span>
              <h3 className="mt-3 text-2xl text-navy">{f.title}</h3>
              <p className="mt-2 text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-muted">
        <div className="hairline pt-6">
          © {new Date().getFullYear()} Marquee. Built for real estate
          professionals. Fair Housing compliant by design.
        </div>
      </footer>
    </main>
  );
}
