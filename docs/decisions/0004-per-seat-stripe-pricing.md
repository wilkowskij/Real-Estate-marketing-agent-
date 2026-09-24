# 0004. Per-seat Stripe pricing with seat blocks

Status: Accepted
Date: 2026-06-01

## Context

The product needed a pricing model that scales from a solo agent to a large brokerage without an "unlimited" tier that caps AI cost exposure, while keeping Stripe's subscription and webhook model as the billing engine.

UNKNOWN: original rationale not recorded for why seat-block-plus-per-additional-seat was chosen over flat per-seat pricing, a single metered/usage-based model, or a simpler flat-tier model with no seat concept.

## Decision

No plan is unlimited. Each plan (Solo, Team, Brokerage) has a finite AI-credit allowance and a finite number of included seats; team/brokerage plans add a second recurring Stripe price line item for each seat beyond the included block.
Source: `lib/billing/plans.ts`, `supabase/migrations/0006_billing.sql` (`subscriptions.seats`), `docs/PRICING.md` "Model"

**UNVERIFIED which specific dollar figures are current.** Two existing docs disagree: `docs/PRICING.md` presents Solo $59 / Team $399 (10 seats) / Brokerage $899 (25 seats) plus $39 and $32 per-additional-seat prices as the live model, while `docs/CHECKLIST.md` lists creating those same recurring Stripe prices as still-open, unchecked owner work ("Pricing repackaged (action needed)"). This record does not take a position on which is correct; PROJECT.md carries the same caveat. Resolve by checking the Stripe dashboard directly for which prices exist and are attached to live subscriptions, or by asking the person who did the repricing work.

## Alternatives considered

UNKNOWN: not recorded.

## Consequences

**Benefits (of the seat-block model, independent of the unresolved dollar figures):** a brokerage's base price is predictable regardless of small headcount changes within the included block; growth beyond the block converts directly to incremental recurring revenue via the seat price, without a repricing conversation.

**Limitations:** two Stripe price objects per paid plan (base + seat) instead of one adds configuration surface — `lib/billing/plans.ts` reads five separate `STRIPE_PRICE_*` environment variables, and a misconfigured or missing one degrades that plan's checkout rather than failing at build/deploy time (checked: these five reads are dynamic `process.env[name]` lookups, invisible to a naive static env-checker — see `scripts/check-env.mjs`'s `DYNAMIC_ENV_READS` allowlist).

**What would make this worth revisiting:** once the pricing conflict above is resolved, this record's dollar-figure UNVERIFIED note should be removed or superseded, whichever the owner confirms.
