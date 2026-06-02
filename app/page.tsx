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
            <p className="mt-6 flex items-center gap-2 text-xs font-medium text-ink-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
              Powered by Claude Opus 4.8 &amp; OpenAI
            </p>
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

      {/* Powered by frontier AI */}
      <section className="border-y border-paper-line bg-navy">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-editorial text-gold">
                Powered by frontier AI
              </p>
              <h2 className="mt-4 font-display text-3xl text-paper md:text-4xl">
                The best models, doing the heavy lifting.
              </h2>
              <p className="mt-4 max-w-md text-paper/70">
                Marquee runs on <span className="font-semibold text-paper">Claude Opus 4.8</span>,
                Anthropic&apos;s most capable model, for market-savvy copy and content
                strategy — and on <span className="font-semibold text-paper">OpenAI</span>{" "}
                image generation for original, on-brand graphics when you don&apos;t
                have a photo. Two best-in-class engines, one polished workflow.
              </p>
            </div>

            {/* Model marks */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Claude */}
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-6">
                <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
                  <path
                    fill="#D97757"
                    d="M9 28 16.8 7.4c.3-.8 1-1.3 1.9-1.3h2.7c.9 0 1.6.5 1.9 1.3L31 28a1 1 0 0 1-.9 1.4h-2.4a1 1 0 0 1-.95-.68l-1.5-4.3a1 1 0 0 0-.95-.67h-6.6a1 1 0 0 0-.95.67l-1.5 4.3a1 1 0 0 1-.95.68h-2.4A1 1 0 0 1 9 28Zm8.2-8.3h5.6L20 11.6l-2.8 8.1Z"
                  />
                </svg>
                <p className="mt-4 font-display text-lg text-paper">Claude Opus 4.8</p>
                <p className="mt-1 text-sm text-paper/60">
                  Copy, local market strategy &amp; the content calendar
                </p>
              </div>

              {/* OpenAI */}
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-6">
                <svg viewBox="0 0 40 40" className="h-10 w-10" fill="#FFFFFF" aria-hidden="true">
                  <path d="M36.6 16.4a9.9 9.9 0 0 0-.85-8.13 10 10 0 0 0-10.78-4.8A9.9 9.9 0 0 0 17.5.02a10 10 0 0 0-9.54 6.93 9.9 9.9 0 0 0-6.62 4.8 10 10 0 0 0 1.23 11.72 9.9 9.9 0 0 0 .85 8.13 10 10 0 0 0 10.78 4.8A9.9 9.9 0 0 0 22.5 40a10 10 0 0 0 9.54-6.94 9.9 9.9 0 0 0 6.62-4.8 10 10 0 0 0-1.23-11.72l-.83-.14Zm-14.1 19.7a7.4 7.4 0 0 1-4.76-1.72l.24-.13 7.9-4.56a1.3 1.3 0 0 0 .65-1.12v-11.14l3.34 1.93.01.07v9.22a7.45 7.45 0 0 1-7.43 7.45Zm-15.98-6.82a7.4 7.4 0 0 1-.89-5l.24.14 7.9 4.56a1.3 1.3 0 0 0 1.3 0l9.65-5.57v3.86a.12.12 0 0 1-.05.1l-7.99 4.61a7.45 7.45 0 0 1-10.16-2.7ZM4.45 12.9a7.4 7.4 0 0 1 3.87-3.26v9.39a1.3 1.3 0 0 0 .65 1.12l9.65 5.57-3.34 1.93a.12.12 0 0 1-.11.01l-8-4.62A7.45 7.45 0 0 1 4.46 12.9Zm27.43 6.38-9.65-5.58 3.34-1.92a.12.12 0 0 1 .11-.01l8 4.61a7.44 7.44 0 0 1-1.15 13.42v-9.4a1.3 1.3 0 0 0-.65-1.12Zm3.32-5 -.24-.14-7.9-4.57a1.3 1.3 0 0 0-1.3 0l-9.65 5.57v-3.86a.12.12 0 0 1 .05-.1l8-4.61a7.44 7.44 0 0 1 11.04 7.71Zm-20.9 6.86-3.34-1.93a.12.12 0 0 1-.06-.08v-9.22a7.44 7.44 0 0 1 12.2-5.71l-.24.13-7.9 4.56a1.3 1.3 0 0 0-.65 1.12l-.01 11.13Zm1.81-3.91 4.3-2.48 4.3 2.48v4.96l-4.3 2.48-4.3-2.48v-4.96Z" />
                </svg>
                <p className="mt-4 font-display text-lg text-paper">OpenAI</p>
                <p className="mt-1 text-sm text-paper/60">
                  Original AI graphics &amp; photo enhancement
                </p>
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
