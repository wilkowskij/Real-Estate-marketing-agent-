# 0001. Supabase as the data, auth, and storage platform

Status: Accepted
Date: 2026-05-29

## Context

The app needed a Postgres database, user authentication with session management, and file storage for listing photos and brand assets, available from day one of a solo-founder build with no dedicated backend team.

UNKNOWN: original rationale not recorded. No design record, PR description, or comment in the initial commit (`Scaffold Next.js + Supabase foundation, agents, design renderer`, 2026-05-29) explains why Supabase was chosen over a self-hosted Postgres + a separate auth provider (Auth.js, Clerk) + object storage (S3), or over a competing all-in-one platform (Firebase, PocketBase, Convex).

## Decision

Use Supabase for Postgres (with Row Level Security as the primary authorization mechanism), Auth (session cookies via `@supabase/ssr`), and Storage (a private `media` bucket for listing photos and brand assets).
Source: `supabase/migrations/0001_init.sql`, `lib/supabase/server.ts`, `middleware.ts`

## Alternatives considered

UNKNOWN: not recorded.

## Consequences

**Benefits observed in the codebase today:** RLS lets the database itself enforce multi-tenant isolation (`is_org_member`/`is_org_admin` helper functions, `supabase/migrations/0001_init.sql`), rather than every query needing an application-layer org filter. Auth, database, and storage are one vendor relationship and one set of credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

**Limitations and lock-in:** RLS policy correctness is now load-bearing for tenant isolation — a missing or wrong policy is a cross-tenant data leak, not just a bug (see `supabase/migrations/0003_lock_down_helper_functions.sql`, `0008_fix_rls_helper_execute_grants.sql`, `0013_perf_indexes_and_rls_initplan.sql`, `0015_consolidate_permissive_rls.sql` — four separate migrations tightening or fixing RLS after the fact, evidence this is an area that has needed rework). Migrating off Supabase later would mean rebuilding auth, storage, and every RLS policy as application-layer authorization checks.

**What would make this worth revisiting:** a specific documented failure (an RLS bug that leaked data across orgs, or a cost/scale ceiling Supabase can't clear) rather than a preference change.
