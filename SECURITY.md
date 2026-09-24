# Security

## Secrets

Credentials, API keys, tokens, private keys, and production connection strings are never committed. Real values live in local `.env.local` files (gitignored) and in Vercel's Environment Variables settings for the running app; `.env.example` (root and `ops-agents/.env.example`) lists names only.

A full git-history secret scan (`gitleaks git`, unshallowed history, all 7 branches this repository has) found zero leaked secrets as of this standardization pass. Secret scanning now also runs on every push and PR via `.github/workflows/ci.yml` (`gitleaks-action`), and locally before every commit via `.pre-commit-config.yaml` once a contributor runs `pre-commit install`.

If a secret is ever committed, rotate it first. Removing it from the file or from git history does not make it safe — it has already been exposed.

## Environment variables

See `.env.example` for the full list of names. `NEXT_PUBLIC_`-prefixed variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`) are safe to expose to the browser by design — Next.js inlines them at build time. Every other variable is server-only and must never be prefixed `NEXT_PUBLIC_`; `SUPABASE_SERVICE_ROLE_KEY` in particular bypasses Row Level Security and must never reach the browser.
Source: `.env.example`, `README.md` "Getting started (local)"

**Gitignore coverage was widened in this pass.** The previous pattern (`​.env`, `.env.local`, `.env*.local`) did not cover `.env.production`, `.env.development`, or `.env.test` — any of those could have been committed by accident. `.gitignore` now uses `.env.*` with a `!.env.example` negation in both the root and `ops-agents/`.

## Authentication and authorization

**Authentication:** Supabase Auth via `@supabase/ssr`; `middleware.ts` refreshes the session cookie on every non-prefetch request and redirects unauthenticated visitors away from protected routes.
Source: `middleware.ts`

**Authorization is enforced primarily at the database layer**, via Postgres Row Level Security policies keyed to org membership (`is_org_member`/`is_org_admin` helper functions). This repository's own migration history includes multiple after-the-fact RLS fixes (`0003_lock_down_helper_functions.sql`, `0008_fix_rls_helper_execute_grants.sql`, `0013_perf_indexes_and_rls_initplan.sql`, `0015_consolidate_permissive_rls.sql`), meaning RLS correctness has needed rework more than once — treat any new table or policy change as security-sensitive, and run the Supabase security advisor after every schema change (see `docs/OPERATIONS.md` "Database migrations").

> ## ⚠️ CRITICAL — Confirmed gap, not yet remediated
>
> The compliance override at `lib/social/publish.ts` and `app/api/posts/[id]/publish/route.ts` is **not role-gated**. Any authenticated org member can set `overrideCompliance: true` and bypass the Fair Housing publish check. **Owner decision pending on fix timeline.** Do not treat this as a routine documentation finding — it is a live authorization gap in a legal-compliance control.
>
> **How it was confirmed:** `lib/social/publish.ts`'s `publishPost()` blocks publishing a post whose campaign carries non-empty `compliance_notes` unless `overrideCompliance: true` is passed. `app/api/posts/[id]/publish/route.ts` reads `overrideCompliance` directly from the request body and passes it straight through, with no check against the caller's org role — `getOrgContext()` returns a `role` field that this route never consults. The in-code comment describes the override as something that happens after "admin acted on the flagged notes," but nothing enforces that only an admin can set it. Any authenticated member of the post's org who can call this endpoint can currently bypass the compliance gate themselves. Both files were read in full; this is not inferred from a comment or the README's prior claim. See also `PROJECT.md`'s business rules and `ARCHITECTURE.md`'s known architectural debt for the same finding (that citation is a factual trace, not a second copy of this risk label).

**Rule this repository should follow going forward:** authorization is checked on the server for every protected or destructive operation, never only in the client UI or only implied by a code comment.

## Input validation

`zod` is used for schema validation in route handlers and domain functions that parse external input (AI-generated JSON responses, form submissions). UNVERIFIED: full route-by-route validation coverage was not audited in this pass — this states the pattern in use, not a claim that every input boundary is validated.
Source: `package.json` (`zod` dependency)

## Data protection

Personal data stored includes: user profiles (name, license number, headshot, contact info), captured leads (name, email, phone, message), and encrypted social OAuth tokens. Social OAuth access/refresh tokens are encrypted at the application layer before storage (`lib/social/crypto.ts`) — never stored or transmitted to the browser in plaintext. Retention: UNKNOWN — no retention or deletion policy for leads, deals, campaigns, or posts was found in the schema, migrations, or documentation; nothing currently deletes old rows automatically (see `docs/DATA_MODEL.md`).

## Logging

UNVERIFIED — no explicit "never log this" policy or logging redaction utility was found in this pass. As a baseline rule regardless: secrets, API keys, OAuth tokens (encrypted or not), and full Stripe payment details must never be written to logs, error messages, or `agent_runs`/`billing_events` audit rows beyond what those tables are designed to hold (cost/token counts and Stripe event payloads respectively — the latter is a legitimate audit use, not a leak, since it's Stripe's own already-scoped webhook payload).

## Third-party services

See `docs/INTEGRATIONS.md` for every external service currently in use, what data each one receives, and its failure behavior. Adding a new service should be documented there in the same PR that wires it in, per this repository's AGENTS.md documentation-update rule.

## Dependencies

`npm audit` reports vulnerabilities in both the root project and `ops-agents/`, as of this standardization pass: root grew from 13 (1 low, 5 moderate, 5 high, 2 critical) to 16 (1 low, 5 moderate, 8 high, 2 critical) after adding ESLint 8's dependency tree in this same change; `ops-agents/` has 5 (2 low, 1 moderate, 2 high). None were triaged individually or fixed in this pass — this documentation-standardization change deliberately did not run `npm audit fix`, per explicit scope instruction, so as not to risk breaking behavior in an otherwise docs-only PR. This is recorded as a follow-up in the PR description, not resolved here. No automated dependency-vulnerability check currently runs in CI; `Dependabot` or an equivalent is not configured in this repository.

## Reporting a problem

UNKNOWN — no security contact, disclosure process, or `SECURITY.md`-style reporting address existed before this file. Route a report to the repository owner directly until a dedicated process is set up.

## Project-specific requirements

**Fair Housing compliance** is a first-class constraint: generated marketing copy is checked for compliance issues (`compliance_notes`), and — modulo the override authorization gap documented above — publishing is meant to be blocked until those notes are resolved or explicitly overridden by someone authorized to do so. `app/terms/page.tsx` states the platform "provides tools to help catch compliance issues, but the final decision... [is the user's]," i.e., this is assistive, not a legal guarantee.
Source: `app/terms/page.tsx`, `lib/agents/marketing.ts`, `lib/social/publish.ts`

No other compliance regime (HIPAA, PCI scope beyond what Stripe Checkout/Portal already isolates, data residency requirement) is documented in this repository.
