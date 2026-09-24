# Deployment

## Hosting

Vercel, via Vercel's GitHub integration. `vercel.json` pins `framework: nextjs` and registers the cron jobs (see below). The app runs on Vercel serverless / Fluid Compute functions.
Source: `vercel.json`, `README.md` "Stack", "Deployment"

## Environments

| Environment | Where | Deploys from | Data |
|---|---|---|---|
| Production | Vercel (production domain) | Every push to the production branch | Live Supabase project, live Stripe |
| Preview | Vercel (per-branch/PR preview URL) | Every push to a non-production branch or PR | UNVERIFIED — whether preview deploys point at the same Supabase project/data as production, or a separate one, was not confirmed in this pass |
| Local | Developer machine, `npm run dev` | N/A | Whatever Supabase project the developer's `.env.local` points at |
| CI | GitHub Actions (`ubuntu-latest`) | Every push to any branch and every PR | No real data — build step only has `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` from repo secrets, nothing else; other env vars are unset during CI |

Source: `README.md` "Deployment", `.github/workflows/ci.yml`

**UNVERIFIED:** which branch is actually configured as Vercel's "production branch" in the Vercel project settings — that setting lives in Vercel's dashboard, not in a file this repository can confirm. `README.md` refers to it generically as "the production branch."

## Build process

`vercel.json` sets `buildCommand: "next build"`. The same build is verified in CI (`.github/workflows/ci.yml`) on every push and PR, using repo secrets for the two public Supabase env vars the build needs at compile time (auth pages instantiate the browser Supabase client during the build).
Source: `vercel.json`, `.github/workflows/ci.yml`

## Environment variables per environment

All runtime env vars for the deployed app are set in **Vercel → Project → Settings → Environment Variables**, not in GitHub Actions secrets — GitHub Actions secrets feed CI's build-verification step only, not the running application. See `.env.example` for the full list of variable names and what each is for; see `docs/INTEGRATIONS.md` for what each one enables and what happens when it's left blank (most third-party integrations degrade gracefully rather than erroring).
Source: `README.md` "Deployment"

**Local development:** `.env.local` (gitignored) is the local override; `.env.example` is the template — `cp .env.example .env.local` and fill in real values, then apply `supabase/migrations/*.sql` to a Supabase project in order.
Source: `README.md` "Getting started (local)"

## Database migrations

23 sequential, numbered SQL files in `supabase/migrations/`, applied in order. UNVERIFIED: whether migrations are applied automatically as part of the Vercel deploy pipeline, or manually against the Supabase project — no migration-apply step was found in `vercel.json` or `.github/workflows/ci.yml`, and the README's "Getting started (local)" instructions describe applying them by hand ("apply supabase/migrations/*.sql to your Supabase project (in order)"). This strongly suggests production migrations are also applied manually/by hand rather than automated, but that was not directly confirmed.

## Cron jobs

Registered in `vercel.json`, running against the production deployment:

| Path | Schedule | Does |
|---|---|---|
| `/api/cron/recurring` | Weekly (Monday 13:00 UTC) | Drafts a local-market/trend post for review |
| `/api/cron/publish-queue` | Daily (09:00 UTC) | Publishes posts whose `scheduled_at` is due |
| `/api/cron/refresh-tokens` | Daily (06:00 UTC) | Refreshes social OAuth tokens nearing expiry |
| `/api/cron/refresh-metrics` | Daily (07:00 UTC) | Snapshots engagement for published posts (no-op until a platform's insights API is live) |
| `/api/cron/refresh-listings` | Daily (08:00 UTC) | Refreshes price/status on previously-imported MLS listings |

All are authenticated by a `CRON_SECRET` bearer token that Vercel Cron sends automatically.
Source: `vercel.json`, `app/api/cron/*`

## How to verify a deploy

UNVERIFIED — no documented post-deploy smoke test or health-check procedure was found. `load-test/k6-smoke.js` exists as a manual load-test script (`BASE_URL=<domain> k6 run load-test/k6-smoke.js`) but is not wired into any deploy pipeline step; it must be run by hand against a target URL.
Source: `load-test/k6-smoke.js`

## Rollback

UNVERIFIED — no rollback procedure is documented in this repository. Vercel's own deployment history/instant-rollback feature is the presumed mechanism (standard Vercel behavior for any project using Git integration), but that is a platform capability, not something this repo configures or documents, so it's stated here as UNVERIFIED rather than as fact.

## Confirmed vs. recommended

**Confirmed by files in this repo:** hosting platform (Vercel), build command, cron schedule and auth mechanism, that CI verifies the build with the two public Supabase vars.
**Recommended, not confirmed:** everything under "How to verify a deploy" and "Rollback" above — these are gaps, not established procedures, and are also listed in `docs/OPERATIONS.md` and the audit's risk notes.
