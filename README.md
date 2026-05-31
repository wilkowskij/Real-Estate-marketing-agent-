# Marquee — Real Estate Marketing Studio

Turn listing photos into ready-to-publish social content. A **multi-tenant SaaS**
for real-estate brokerages and solo agents, with deep specialization for
**New Jersey / Monmouth County**.

A company uploads its **brand guide** (or sets brand by hand), invites its
**agents**, and each agent uploads their own **listings + photos** to generate
on-brand posts. Three Claude-powered agents collaborate:

- **Marketing Agent** — NJ / Monmouth specialist; writes the copy package
  (headline, caption, CTA, hashtags) in a research-tuned, Fair-Housing-compliant
  voice, and picks the winning format (Reel / carousel / infographic / image).
- **Design Agent** — selects the hero photo and renders an on-brand graphic;
  optional AI photo enhancement via a pluggable image provider (OpenAI `gpt-image-1`).
- **Strategy / Orchestrator Agent** — plans a 30-day content calendar balanced to
  proven content-mix ratios, runs recurring local-market posts, and watches for
  viral angles; everything lands in an approval queue.

→ **New here? Read [`docs/ONBOARDING.md`](docs/ONBOARDING.md)** for the company
and agent walkthrough, and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deploy
+ env setup.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind** (Luxe Ivory & Gold theme)
- **Supabase** — Postgres + Row Level Security, Auth, Storage
- **Claude API** (`@anthropic-ai/sdk`) with prompt caching on the big knowledge prompts
- **@vercel/og** for deterministic, brand-driven graphic rendering
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
| `ANTHROPIC_API_KEY` | The three agents |
| `CRON_SECRET` | Bearer token the cron routes require |
| `SOCIAL_TOKEN_ENC_KEY` | 32-byte base64 — encrypts social OAuth tokens at rest |
| `OPENAI_API_KEY` + `IMAGE_PROVIDER=openai` | Optional — enables AI photo enhancement |
| `META_*` / `LINKEDIN_*` | Optional — live social posting (after platform approval) |

Then sign up, complete (or import) your brand kit, and create a campaign at
`/generate`.

## Project layout

- `app/(app)/` — dashboard, generate, calendar, brand, team, library, settings
- `app/api/` — campaigns/generate, calendar/plan, brand (+asset/extract/library),
  team (invite/members/locks), social (connect/callback), posts, cron/*
- `lib/agents/` — marketing, design, orchestrator, calendar planner, brand extractor
- `lib/design/` — `@vercel/og` template renderer, platform sizes, image provider
- `lib/branding/` — brand resolver (+ tests)
- `lib/social/` — OAuth, token crypto, publishers (manual-export fallback + live)
- `supabase/migrations/` — schema, RLS, storage policies, new-user bootstrap

## Automation (Vercel Cron)

`vercel.json` registers three daily/weekly jobs (Hobby-plan safe):

| Path | Schedule | Does |
| --- | --- | --- |
| `/api/cron/recurring` | weekly | Drafts a local-market / trend post for review |
| `/api/cron/publish-queue` | daily | Publishes posts whose `scheduled_at` is due |
| `/api/cron/refresh-tokens` | daily | Refreshes social OAuth tokens nearing expiry |

## Deployment

Connected via **Vercel's GitHub integration** — every push to the production
branch auto-deploys; `vercel.json` pins `framework: nextjs` and the crons. Set
all runtime env vars in **Vercel → Project → Settings → Environment Variables**
(GitHub Actions secrets feed CI only, not the running app). Full steps in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## Compliance

Fair Housing is a first-class constraint, two layers deep: the marketing-agent
prompt forbids steering language, and a **publish gate** blocks any post whose
campaign carries unresolved compliance notes unless an admin explicitly
overrides after review.

## Verification

```bash
npm run test     # 40 tests: brand resolver, token crypto, publish gate,
                 # calendar scheduler, copy parsing, cost math, route auth
npx tsc --noEmit
npm run build
```
