# Architecture

Describes the system as it exists today. Proposed changes belong in a decision record until they are built.

## System overview

A Next.js App Router application, hosted on Vercel, with Supabase providing Postgres (RLS-enforced multi-tenancy), authentication, and file storage. Claude-powered agents generate marketing copy and plan content calendars; a pluggable provider layer optionally adds AI image generation (OpenAI) and video rendering (Shotstack). Stripe handles subscription billing. A separate `ops-agents/` package (see `docs/decisions/0005-ops-agents-standalone-service.md`) is an internal Slack bot with no runtime dependency on the product app.

```mermaid
flowchart LR
  User[Agent / Brokerage user] --> Web[Next.js App Router]
  Public[Public visitor / QR scan] --> Web
  Web --> MW[middleware.ts — session refresh + route gating]
  MW --> API[app/api/* route handlers]
  API --> Agents[lib/agents/* — Claude-powered generation]
  API --> DB[(Supabase Postgres, RLS)]
  API --> Storage[(Supabase Storage: media bucket)]
  API --> Stripe[Stripe: checkout, portal, webhooks]
  API --> Social[Meta / LinkedIn / X: OAuth + publish]
  API --> MLS[RentCast: MLS listing data]
  Agents --> Claude[Anthropic Claude API]
  Agents -.optional.-> OpenAI[OpenAI gpt-image-1]
  API -.optional.-> Shotstack[Shotstack video render]
  Cron[Vercel Cron] --> API
```
Source: `middleware.ts`, `app/api/**`, `lib/agents/*`, `vercel.json`

## Layers

| Layer | Responsibility | Location |
|---|---|---|
| Routing/UI | Pages, forms, client interactivity | `app/(app)/`, `app/l/`, `app/r/`, `components/` |
| API | Route handlers: validate input, call domain logic, return JSON | `app/api/` |
| Domain/agents | Business rules, AI generation prompts and parsing, compliance gating | `lib/agents/`, `lib/billing/`, `lib/branding/`, `lib/social/` |
| Data access | Supabase client construction, storage helpers | `lib/supabase/`, `lib/storage.ts` |
| Integrations | Third-party API clients | `lib/anthropic/`, `lib/listings/`, `lib/email/`, `lib/notion/`, `lib/design/imageProvider.ts`, `lib/video/videoProvider.ts` |

Source: directory structure as tracked in `git ls-files`

## Directory map

- `app/(app)/` — the authenticated app shell: dashboard, generate, campaigns, calendar, analytics, library, company (agents/brand/subscription), profile.
- `app/api/` — route handlers for campaigns, listings, brand, team, social OAuth, posts, billing, Stripe webhooks, cron triggers, lead capture, QR/tracked-link redirects.
- `app/l/[slug]/`, `app/r/[slug]/` — public, unauthenticated routes: lead-capture landing pages and tracked-link redirects.
- `lib/agents/` — Marketing, Messaging (email/SMS), Design, Orchestrator, Calendar planner, brand extractor, and the Stop Slop quality gate.
- `lib/design/` — `@vercel/og` template renderer, platform size presets, the pluggable image provider.
- `lib/social/` — OAuth flow, token encryption, publishers (per-platform + manual-export), the publish gate, the engagement-metrics fetcher framework.
- `lib/billing/` — Stripe client, plan/price configuration, subscription and usage-metering logic.
- `supabase/migrations/` — the schema of record; see `docs/DATA_MODEL.md`.
Source: `README.md` "Project layout", verified against `git ls-files`

## Frontend

Next.js App Router with React 18, TypeScript, and Tailwind CSS (a "Luxe Ivory & Gold" theme, overridden per-org for white-labeled brokerages). Client components handle interactive flows (the campaign generator, the photo editor, the calendar queue); most data fetching for authenticated pages runs server-side through Supabase server clients.
Source: `package.json`, `README.md` "Stack", `app/(app)/generate/GenerateClient.tsx`, `lib/branding/resolveBrand.ts`

## Backend and API

Route handlers under `app/api/` are the entire backend — there is no separate API server. Handlers call domain logic in `lib/`, which in turn calls Supabase (via a server-side client, or the service-role client for cron/webhook contexts that must bypass RLS) and third-party APIs. Validation is done with `zod` in the routes/domain functions that need it. Errors are generally caught and returned as JSON with an HTTP status; `docs/OPERATIONS.md` documents the specific error-handling pattern for AI generation failures (`friendlyAiError`-style wrapping, per that doc, UNVERIFIED against the exact function name in this pass).
Source: `package.json` (`zod` dependency), `app/api/**/route.ts`, `docs/OPERATIONS.md`

## Data

Supabase Postgres with Row Level Security as the primary authorization mechanism; see `docs/DATA_MODEL.md` for entities and `docs/decisions/0001-supabase-as-data-auth-storage-platform.md` for why Supabase was chosen (rationale UNKNOWN, not recorded at the time). Migrations are sequential, forward-only SQL files in `supabase/migrations/`.

## Authentication and authorization

**Authentication:** Supabase Auth via `@supabase/ssr`; `middleware.ts` refreshes the session on every non-prefetch request and redirects unauthenticated visitors away from a fixed list of protected route prefixes.
Source: `middleware.ts`

**Authorization:** enforced primarily at the database layer via Row Level Security policies keyed to org membership, using `is_org_member`/`is_org_admin` SQL helper functions (`supabase/migrations/0001_init.sql`). This is a deliberate architectural choice (see decision 0001): a missing or wrong RLS policy is a cross-tenant data leak, not just an application bug, and this repo's own migration history shows several after-the-fact RLS fixes (`0003`, `0008`, `0013`, `0015`).

**Finding — an authorization gap traced, not inferred:** the Fair Housing publish gate (`lib/social/publish.ts`, `publishPost()`) blocks publishing a post whose campaign has non-empty `compliance_notes` unless the caller passes `overrideCompliance: true`. The route that exposes this (`app/api/posts/[id]/publish/route.ts`) accepts `overrideCompliance` directly from the request body and passes it through with **no check of the caller's org role**. `getOrgContext()` (`lib/org.ts`) does return a `role` field, but this route never reads it before honoring the override. In code, the override comment reads "admin acted on the flagged notes," but nothing enforces that any particular role acted — any authenticated member who can reach this endpoint for their org's post can currently set `overrideCompliance: true` themselves. This is stated here as a confirmed finding (I read both files end to end), not a suspicion; see `SECURITY.md` for the same finding under "Authentication and authorization" and `PROJECT.md`'s business rules section.

## External services

See `docs/INTEGRATIONS.md` for the full per-service detail (data sent/received, auth method, failure behavior, setup steps). In one line each: Supabase (data/auth/storage), Anthropic Claude (content generation), OpenAI (optional AI images), Shotstack (optional video render), RentCast (MLS import), Resend (transactional email), Notion (feedback mirror, optional), Stripe (billing), Meta/LinkedIn/X (social publishing).

## Data flow

**Generate → approve → publish:** a user submits a campaign brief → `lib/agents/marketing.ts`/`messaging.ts` call Claude and parse the response into copy + `compliance_notes` → `lib/design` renders a graphic (or calls the image provider) → the result is stored as a `campaigns` row and one or more `posts` rows in `draft` state → a human approves (or auto-approve fires if compliance is clean) → `lib/social/publish.ts` checks the compliance gate, resolves a connected social account, and either calls the live publisher or falls back to manual export → `posts.state` updates to `published` or `failed`.
Source: `lib/agents/marketing.ts`, `lib/social/publish.ts`, `app/(app)/calendar/QueueItem.tsx`

**Lead → deal → revenue:** a public visitor submits a lead-capture form or scans a QR code (`app/l/[slug]/`) → a `leads` row is created, optionally linked to the listing/campaign that drove it → an agent converts a promising lead into a `deals` row → the deal moves through a stage pipeline to `closed_won`, at which point its `value` represents realized revenue attributable back through `tracked_links`/the originating campaign.
Source: `supabase/migrations/0011_lead_capture.sql`, `0012_revenue_attribution.sql`, `app/r/[slug]/route.ts`

## Hosting and environments

| Environment | Where | Deploys from | Data |
|---|---|---|---|
| Production | Vercel | Production branch (push-triggered) | Live Supabase project, live Stripe |
| Preview | Vercel (per-branch/PR URL) | Any non-production push or PR | UNVERIFIED — same or separate Supabase project not confirmed |
| Local | Developer machine | N/A | Whatever Supabase project `.env.local` points at |

Full detail, including the five cron jobs and their auth mechanism: `docs/DEPLOYMENT.md`.

## Constraints

- **Analytics query pattern doesn't scale past low data volume.** `docs/SCALABILITY.md` (2026-06-03 assessment) identifies `/analytics` as currently selecting all `posts` and all `social_metrics` rows with no limit and aggregating in JavaScript — fine at the volume measured then (2 orgs, 20 posts), flagged as the one query pattern needing a SQL-side rewrite (`count`/`sum` or a rolling window) before an org accumulates thousands of rows.
- **RLS policy consolidation deferred.** The same assessment identifies `memberships`, `profiles`, and `social_accounts` as each running two permissive SELECT policies (a `FOR ALL` write policy plus a separate `FOR SELECT` read policy) where one would do; `memberships` and `profiles` are read on every authenticated request, making this the highest-value RLS tuning opportunity, deliberately deferred because rewriting live auth policies "warrants a careful, separately-tested change" after one prior RLS incident.
- **Auth middleware calls `supabase.auth.getUser()` on every non-prefetch request**, a network hop to Supabase Auth on every page load — standard for server-rendered auth, acceptable at the scale measured, a candidate for JWT-verification caching at much larger scale.
- **AI generation throughput is governed by the Anthropic/OpenAI account's own rate limits and credit balance**, not by anything in this application's code.
- **Vercel Hobby plan caps cron frequency to daily.**

Source: `docs/SCALABILITY.md` (carried forward into this file as of the 2026-06-03 assessment date; not independently re-measured in this pass)

## Known architectural debt

- **The Fair Housing override authorization gap** described above under Authentication and authorization — any org member can currently bypass the compliance gate, not just an admin, despite code comments implying otherwise.
- **`ops-agents/` is documented as temporary residency** inside this repository (see decision 0005) but has not yet been extracted; until it is, this repository documents and enforces standards for two codebases with different lifecycles and different env surfaces.
- **`scripts/check-env.mjs` does not check `ops-agents/`'s own env surface** — it's explicitly excluded to avoid false positives between two separate `.env.example` files; `ops-agents/.env.example` was manually verified against `ops-agents/src/` in this pass but has no automated check of its own yet.
- **The public marketing homepage and lead-capture landing pages may be blocked by Vercel Deployment Protection** on the raw `*.vercel.app` production URL — `docs/SCALABILITY.md` recorded anonymous requests returning HTTP 403 there as of its assessment date, which would mean real visitors and QR scans can't reach lead capture through that URL. UNVERIFIED whether this has since been resolved (for example, by attaching a custom domain); not independently re-tested in this pass.
