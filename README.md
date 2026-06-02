# Marquee — Real Estate Marketing Studio

Turn listing photos into ready-to-publish marketing across **every channel**. A
**multi-tenant SaaS** for real-estate brokerages and solo agents, with deep
specialization for **New Jersey / Monmouth County**.

A company uploads its **brand guide** (or sets brand by hand), invites its
**agents**, and each agent uploads their own **listings + photos** to generate
on-brand content. Claude-powered agents collaborate:

- **Marketing Agent** — NJ / Monmouth specialist; writes the copy package
  (headline, caption, CTA, hashtags) in a research-tuned, Fair-Housing-compliant
  voice, and picks the winning format (Reel / carousel / infographic / image).
- **Messaging Agent** — the same local expertise for **email + SMS** nurture
  copy (subject + preheader + body, or a ≤320-char text), sharing the cached
  system prompt so calls stay cheap.
- **Design Agent** — selects the hero photo and renders an on-brand graphic;
  optional AI photo enhancement / from-scratch image via a pluggable provider
  (OpenAI `gpt-image-1`).
- **Strategy / Orchestrator Agent** — plans a 30-day content calendar balanced to
  proven content-mix ratios (now **adjustable per bucket**), runs recurring
  local-market posts, and watches for viral angles; everything lands in an
  approval queue.

Every generation runs through **Stop Slop**, a deterministic quality gate that
flags tired real-estate clichés and copy with no local specificity — no extra
LLM call.

→ **New here? Read [`docs/ONBOARDING.md`](docs/ONBOARDING.md)** for the company
and agent walkthrough, [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deploy +
env setup, and [`docs/CHECKLIST.md`](docs/CHECKLIST.md) for the live open-items
list.

## Status

**Live in production** (multi-tenant, NJ/Monmouth-tuned). Working today:

- AI content engine — 10 campaign types, format-aware copy, AI image generation
  + in-browser photo editor
- **Email + SMS** content types with inbox / iMessage previews
- **Campaigns** — a named, multi-channel object grouping social posts + email +
  SMS under one listing and strategy
- **Analytics** — production stats + content-mix actual-vs-target (engagement
  metrics populate once social insights access is approved)
- Multi-tenant orgs/agents, brand kit, brand-doc import, locked fields
- **Stripe billing** — plans, checkout, customer portal, webhooks, usage
  metering (verified end-to-end in production)
- Social OAuth + publishers + publish queue (per-person connections; IG / FB /
  LI / X) — **live posting is gated on Meta/LinkedIn app review**, so until
  approval the queue falls back to **manual export** (download image + copy
  caption) with an identical UI

The app surface: **Studio · Create · Campaigns · Calendar · Analytics · Library ·
Company · Profile**.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind** (Luxe Ivory & Gold theme)
- **Supabase** — Postgres + Row Level Security, Auth, Storage
- **Claude API** (`@anthropic-ai/sdk`) with prompt caching on the big knowledge prompts
- **@vercel/og** for deterministic, brand-driven graphic rendering
- **Stripe** — subscriptions, checkout, customer portal, webhooks
- **Vercel** deploy (Git integration) + Vercel Cron for automation

## Branding & tenancy

One schema serves **both** company brokerages and solo agents. Every user
belongs to an **org** (auto-created for solo signups). Org admins set a brand kit
— or **import it from a brand-guide document** (PDF / .md / .txt) — and can
**lock** fields (logo, colors, fonts, disclaimer). Members inherit the locked
company brand and layer personal details (headshot, contact, license).
`lib/branding/resolveBrand.ts` merges org + member into the single brand object
the templates consume.

## Getting started (local)

```bash
npm install
cp .env.example .env.local      # fill in the keys below
# apply supabase/migrations/*.sql to your Supabase project (in order)
npm run dev
```

Required env (see `.env.example` for the full list):

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: cron jobs + OAuth token writes (**never** `NEXT_PUBLIC_`) |
| `ANTHROPIC_API_KEY` | The Claude agents (keep credits funded — calls 400 on an empty balance) |
| `NEXT_PUBLIC_APP_URL` | Production origin, used for OAuth/redirect/checkout URLs |
| `CRON_SECRET` | Bearer token the cron routes require |
| `SOCIAL_TOKEN_ENC_KEY` | 32-byte base64 — encrypts social OAuth tokens at rest |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing + webhook signature verification |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_TEAM` / `_BROKERAGE` | The four plan price IDs |
| `OPENAI_API_KEY` + `IMAGE_PROVIDER=openai` | Optional — AI image generation / enhancement |
| `META_*` / `LINKEDIN_*` / `TWITTER_*` | Optional — live social posting (after platform approval) |

Then sign up, complete (or import) your brand kit, and create a campaign at
`/generate`.

## Project layout

- `app/(app)/` — dashboard, generate, **campaigns**, calendar, **analytics**,
  library, **company** (agents / brand / subscription), **profile** (details /
  connections)
- `app/api/` — `campaigns/{generate,parse,message}` + campaign CRUD,
  `calendar/plan`, `brand/*`, `team/*`, `social/{connect,callback}`, `posts/*`,
  `billing/*`, `webhooks/stripe`, `cron/*`
- `lib/agents/` — marketing, **messaging** (email/SMS), design, orchestrator,
  calendar planner, brand extractor, **stopSlop**
- `lib/design/` — `@vercel/og` template renderer, platform sizes, image provider
- `lib/branding/` — brand resolver (+ tests)
- `lib/social/` — OAuth, token crypto, publishers (manual-export + live),
  **metrics fetcher framework**
- `lib/analytics/` — production / content-mix / engagement summarizers (+ tests)
- `lib/billing/` — Stripe client, plans, subscription + usage metering
- `supabase/migrations/` — schema, RLS, storage policies, billing, campaign
  object, social metrics

## Automation (Vercel Cron)

`vercel.json` registers these jobs (daily/weekly, Hobby-plan safe):

| Path | Schedule | Does |
| --- | --- | --- |
| `/api/cron/recurring` | weekly | Drafts a local-market / trend post for review |
| `/api/cron/publish-queue` | daily | Publishes posts whose `scheduled_at` is due |
| `/api/cron/refresh-tokens` | daily | Refreshes social OAuth tokens nearing expiry |
| `/api/cron/refresh-metrics` | daily | Snapshots engagement for published posts (no-op until a platform's insights API is live) |

## Deployment

Connected via **Vercel's GitHub integration** — every push to the **production
branch** auto-deploys (preview deploys for other branches). `vercel.json` pins
`framework: nextjs` and the crons. Set all runtime env vars in **Vercel →
Project → Settings → Environment Variables** (GitHub Actions secrets feed CI
only, not the running app). Full steps in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## Compliance

Fair Housing is a first-class constraint, two layers deep: the marketing-agent
prompt forbids steering language, and a **publish gate** blocks any post whose
campaign carries unresolved compliance notes unless an admin explicitly
overrides after review.

## Roadmap

Shipped pillars: AI content engine, AI imagery, multi-tenant brand, social OAuth
+ queue, Stripe billing, Email + SMS, Campaign object, Analytics engine. Next, in
order (see [`docs/CHECKLIST.md`](docs/CHECKLIST.md) and
[`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md)):

- **Lead capture / CRM** — landing pages, forms, QR codes, open-house sign-in, a
  `leads` table
- **Revenue attribution** — post → click → lead → deal (`opportunities`, `deals`)
- **Video marketing engine** — scene detection → clips → Reels
- **Stories / Reels** publishing endpoints
- **White-label theming** for brokerages + a brokerage-wide "who's connected" view
- **Mobile sidebar nav** (currently desktop-only)

External gates: live social posting awaits **Meta/LinkedIn app review**; the
Analytics engagement metrics and Revenue attribution light up once that access
lands.

## Verification

```bash
npm run test     # 55 tests: brand resolver, token crypto, publish gate, calendar
                 # scheduler, copy + email/SMS parsing, Stop Slop, analytics
                 # summarizers, cost math, route auth
npx tsc --noEmit
npm run build
```
