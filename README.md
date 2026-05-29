# Marquee — Real Estate Marketing Studio

Turn listing photos into ready-to-publish social media content. Built for
real estate agents in **New Jersey & Monmouth County**.

Agents upload photos and pick a campaign type (**Just Sold**, **New Listing**,
**Open House**, or custom). Three specialized agents collaborate:

- **Marketing Agent** — an NJ / Monmouth County specialist that writes the copy
  (headline, caption, CTA, hashtags) with Fair-Housing-compliant language.
- **Design Agent** — picks the hero photo and renders an on-brand graphic;
  supports AI image enhancement via a pluggable provider.
- **Strategy / Orchestrator Agent** — runs recurring local-market posts and a
  viral-trend watcher, queuing drafts for review.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind** (editorial/luxury theme)
- **Supabase** — Postgres + RLS, Auth, Storage
- **Claude API** (`@anthropic-ai/sdk`) with prompt caching
- **@vercel/og** for deterministic, brand-driven graphic rendering
- **Vercel** deploy + Cron for automation

## Branding & tenancy

One schema serves **both** company brokerages and solo agents. Every user
belongs to an org (auto-created for solo signups). Org admins set a brand kit
and can **lock** fields (logo, colors, fonts, disclaimer); members inherit and
layer personal details. `lib/branding/resolveBrand.ts` merges org + member into
the single brand object templates consume.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
# apply supabase/migrations/*.sql to your Supabase project
npm run dev
```

Then sign up, complete your brand kit, and create a campaign at `/generate`.

## Project layout

- `app/` — routes (landing, auth, dashboard, generate, calendar, brand, team)
- `app/api/` — `campaigns/generate`, `assets/upload`, `cron/recurring`
- `lib/agents/` — marketing, design, orchestrator (Claude)
- `lib/design/` — template renderer, platform sizes, image provider
- `lib/branding/` — brand resolver (+ tests)
- `lib/social/` — publisher interface (manual-export fallback until API approvals)
- `supabase/migrations/` — schema, RLS, storage policies, new-user bootstrap

## Status / roadmap

- ✅ Foundation, branding, core generator (copy + branded graphic), auth
- ⏳ AI image enhancement provider, more template themes
- ⏳ Live Instagram/Facebook/LinkedIn posting (pending Meta/LinkedIn app review;
  manual export works today)
- ⏳ Full automation UI (approval queue, scheduling)

## Verification

```bash
npm run typecheck
npm run test        # brand resolver inheritance + lock precedence
npm run build
```

Fair Housing compliance is a first-class constraint in the marketing agent
prompt and a review gate — not an afterthought.
