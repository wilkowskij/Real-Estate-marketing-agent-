# 0002. Single schema for both brokerage orgs and solo agents

Status: Accepted
Date: 2026-05-29

## Context

The product serves two customer shapes: a brokerage with many agents under one brand, and a solo agent with no company above them. Both need brand kits, listings, campaigns, and billing.

UNKNOWN: original rationale not recorded. No record explains why a single `orgs`/`memberships` schema was chosen over two separate paths (a "personal account" concept distinct from a "team account," as many multi-tenant SaaS products model it).

## Decision

Model every user as a member of exactly one `org`. A solo agent's signup auto-creates an org with `is_solo = true` for them alone; a brokerage's org has many members. Brand kits, listings, and billing all attach to the org, not the individual, and can be owned at the org level (brokerage-wide, lockable) or the member level (solo agent, or an agent's personal overrides within a brokerage).
Source: `supabase/migrations/0001_init.sql` (`orgs`, `memberships`, `brand_owner` enum), `lib/branding/resolveBrand.ts`, `README.md` "Branding & tenancy"

## Alternatives considered

UNKNOWN: not recorded.

## Consequences

**Benefits observed in the codebase today:** one code path serves both customer types — no separate "personal" vs. "team" application logic, billing model, or brand-resolution function to maintain. `lib/branding/resolveBrand.ts` merges org-level (lockable) and member-level brand fields with the same merge logic regardless of whether the org has one member or fifty.

**Limitations:** a solo agent's data model carries brokerage-shaped columns and concepts (`org_id` foreign keys everywhere, a `memberships` row with a role that is always `owner` for them) that add a small amount of indirection for the simplest use case. Every query and RLS policy in the system, including for a solo agent, goes through the org-scoping helper functions rather than a simpler user-scoped check.

**What would make this worth revisiting:** if solo-agent-specific features start needing to diverge meaningfully from brokerage features (rather than just hiding brokerage-only UI), the shared schema could become a constraint rather than a simplification.
