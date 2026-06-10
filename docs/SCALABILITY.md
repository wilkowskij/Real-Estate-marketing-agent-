# Scalability & load assessment

_Run: 2026-06-03. Question: can Marquee handle ~100 users, and what needs upgrading?_

## Verdict

**Yes — the architecture handles 100 users (and well beyond) for browsing and
CRUD.** Nothing in the request path is single-threaded or stateful: Vercel Fluid
Compute scales function instances horizontally, and Supabase serves the app
through PostgREST + a connection pooler (the app never holds raw Postgres
connections). The real ceilings are **plan tiers** and **AI-provider rate
limits**, plus a few **bounded-query fixes** before data volume grows — all
listed below.

## 1. Regression (green)

| Check | Result |
| --- | --- |
| Unit tests (`vitest`) | **66 / 66 pass** (12 files) |
| Type check (`tsc --noEmit`) | clean |
| Production build (`next build`) | compiles, all routes |

Coverage spans the pure logic that matters: brand resolver, token crypto,
publish gate, calendar scheduler (incl. platform filter), copy + email/SMS
parsing, Stop Slop, analytics summarizers, plan/seat math, route auth.

## 2. Database audit (Supabase advisors)

Postgres 17, region `us-east-2`. Current volume is tiny (2 orgs, 20 posts), so
these are projections from the linter, not measured hot spots.

**Fixed in migration `0013` (applied):**
- Added covering indexes for nine query/join-facing foreign keys (leads,
  deals, lead_forms, posts, social_accounts, trends, campaigns).
- Fixed the `profiles_self_write` RLS **init-plan** so `auth.uid()` is evaluated
  once per query instead of once per row (behaviour-identical).

**Recommended (documented, not yet applied — low priority at 100 users):**
- **Consolidate multiple permissive SELECT policies** on `memberships`,
  `profiles`, `social_accounts` (each has a `FOR ALL` write policy + a
  `FOR SELECT` read policy, so SELECT evaluates two policies). Split the write
  policy into `INSERT/UPDATE/DELETE` so SELECT runs one policy. `memberships`
  and `profiles` are read on **every authenticated request**, so this is the
  highest-value RLS tune — deferred only because rewriting live auth policies
  warrants a careful, separately-tested change (we had one RLS incident before).
- Several **unused indexes** are flagged simply because traffic is low; they'll
  be exercised as data grows. No action.

**Security advisors:** no real holes. The `SECURITY DEFINER` warnings
(`is_org_member/_admin`, `owns_membership`, `increment_link_click`) are
**by design** — the membership helpers only return booleans about the *caller's*
own membership, and the link-click function only bumps a counter. `billing_events`
having RLS-on/no-policy is intentional (service-role audit table). **One action:**
enable **Leaked Password Protection** (Supabase → Auth → Passwords).

## 3. Code-level scaling review

- **`getOrgContext`** runs on every page/route: 1 membership query +
  `Promise.all` of 3 (brand kits, profile, subscription). ~4 light indexed
  queries/request — fine. ✅
- **Auth middleware** calls `supabase.auth.getUser()` on every non-prefetch
  request (a network hop to Supabase Auth). Standard for SSR; acceptable at 100
  users. At much larger scale, cache the JWT verification. ⚠️ (low)
- **Analytics page** (`/analytics`) currently selects **all** `posts` and
  **all** `social_metrics` rows with no limit and aggregates in JS. Fine today;
  **fix before volume grows** — move counts/sums into SQL (`count`, `sum`) or add
  a rolling time window. ⚠️ (medium — the one query pattern that won't scale)
- **Leads / campaigns / calendar** queries are bounded (`limit`, `in(ids)`) or
  per-org small sets. ✅
- **Crons** (`refresh-tokens`, `publish-queue`, `recurring`, `refresh-metrics`)
  iterate per-account/per-post best-effort; trivial at 100 users. ✅
- **Image upload** resizes client-side (≤2048px) before hitting the 4.5 MB
  function-body limit. ✅
- **AI generation** (`/api/campaigns/generate|message`, image gen) is the
  expensive path: a Claude call (+ optional OpenAI image + OG render), `maxDuration`
  45–60s. Throughput here is governed by **provider rate limits**, not the app.

## 4. Edge latency (measured)

A 50-request / 10-concurrent burst at the production edge returned in **~0.5 s
wall** (avg **78 ms**, p95 **113 ms**) — the edge tier is healthy and easily
handles 100 concurrent users on read paths.

> ⚠️ **Finding:** anonymous requests to the `*.vercel.app` production URL return
> **HTTP 403** (Vercel **Deployment Protection** / bot challenge). That means the
> **public marketing homepage and lead-capture landing pages (`/l/<slug>`,
> `/r/<slug>`) are not reachable by real visitors or QR scans** behind that URL.
> **Action:** attach a custom domain and/or disable Deployment Protection (or add
> a public bypass) for the public routes before launch — otherwise lead capture
> can't collect leads.

## 5. What to upgrade for 100 users

Priority order:

1. **Vercel plan → Pro.** Hobby prohibits commercial use, caps cron to **daily**,
   and has lower concurrency/limits. Pro unlocks finer cron (so `publish-queue`
   can run hourly+), higher concurrency, and observability. **Required to launch
   commercially.**
2. **Public access / domain.** Resolve the 403 above: custom domain + Deployment
   Protection off (or bypassed) for `/`, `/l/*`, `/r/*`.
3. **Supabase plan → Pro.** Free tier pauses on inactivity, has a small compute
   instance, 7-day-only PITR-less backups, and lower connection ceilings. Pro
   gives a dedicated compute add-on path, daily backups, no auto-pause, and a
   larger pooler. **Required for a real customer base.**
4. **AI provider rate limits.** The true throughput ceiling. Raise the
   **Anthropic** usage tier (and **OpenAI** image tier) to match expected
   concurrent generations; keep account credits funded. Consider a queue +
   backoff if many users generate at once.
5. **Analytics query** (code): move `/analytics` aggregation into SQL / a rolling
   window before any org accumulates thousands of posts/metrics.
6. **RLS policy consolidation** (DB): apply the deferred memberships/profiles/
   social_accounts split in a tested change.
7. **Leaked-password protection** (Supabase Auth): one toggle.

## How to load-test (repeatable)

`load-test/k6-smoke.js` drives the **safe** paths (homepage, a lead landing page,
a tracked-link redirect, and an optional authenticated dashboard read via a
session cookie). It intentionally avoids the paid AI endpoints.

```bash
brew install k6   # or https://k6.io/docs/get-started/installation
BASE_URL=https://your-domain.com VUS=100 DURATION=1m \
  LEAD_SLUG=your-form-slug LINK_SLUG=your-link-slug \
  k6 run load-test/k6-smoke.js
```

Thresholds: <1% errors, p95 < 800 ms.
