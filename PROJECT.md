# Project

## Overview

Marquee is a multi-tenant SaaS that turns real-estate listing photos into ready-to-publish marketing content — social posts, email, SMS, a 30-day content calendar — using Claude-powered agents, for individual real-estate agents and the brokerages that employ them. It specializes in New Jersey / Monmouth County local market knowledge and enforces Fair Housing compliance in generated copy.
Source: `README.md`

## Problem

A real-estate agent or small brokerage needs a steady stream of on-brand, locally-specific marketing content (listing announcements, open-house promotion, market updates) across multiple channels, but either lacks the time/skill to produce it themselves or the budget for a dedicated marketing hire or agency. UNKNOWN: no specific cost or time figure for the problem is documented in this repository; `docs/PRICING.md` references "market research" behind the pricing model but the research itself isn't in the repo.

## Users

| User | What they need from this |
|---|---|
| Solo real-estate agent | Generate on-brand social/email/SMS content from their own listings without a marketing budget or skill set; capture and track leads from that content |
| Brokerage admin/owner | Set one brand guide that every agent under them inherits automatically; see which agents are connected to which social platforms; manage billing/seats for the whole team |
| Team member (agent within a brokerage) | Use the brokerage's brand, layer in personal details (headshot, license, contact), generate their own content within that shared identity |

Source: `README.md` "Branding & tenancy", `docs/ONBOARDING.md`

## Primary workflows

**Generate a listing campaign:** an agent picks a listing (manually entered or imported from MLS via RentCast), selects a campaign type (just sold, new listing, open house, custom), and the Marketing/Design/Messaging agents produce a copy package (headline, caption, CTA, hashtags), a rendered graphic, and optionally email/SMS variants — gated by a Fair Housing compliance check before it can be scheduled or published.
Source: `README.md`, `lib/agents/marketing.ts`, `lib/agents/design.ts`

**Plan a content calendar:** the Orchestrator/Calendar agent plans a 30-day mix of listing content, local-market posts, and trend-aware content balanced against configurable content-mix ratios; generated posts land in an approval queue rather than publishing automatically unless auto-approve is on and the post is compliance-clean.
Source: `lib/agents/orchestrator.ts`, `lib/agents/calendar.ts`, `app/(app)/calendar/`

**Capture and track a lead:** a public landing page or QR code (tied to a listing, an open house, or a tracked link) captures a lead into the `leads` table; an agent can convert a lead into a `deal` and track it through a pipeline to closed revenue, closing the loop from a specific post back to commission earned.
Source: `supabase/migrations/0011_lead_capture.sql`, `0012_revenue_attribution.sql`, `app/l/[slug]/`, `app/r/[slug]/`

**Publish to social:** an approved post either publishes live (if the agent has connected that platform and, for Meta platforms, if app review has been granted) or falls back to a manual-export flow (download the image, copy the caption) with an identical UI either way.
Source: `lib/social/publish.ts`, `README.md` "Status"

## Current functionality

Everything under "Shipped" in `docs/CHECKLIST.md` is live: the AI content engine (10 campaign types, format-aware), AI image generation and an in-browser photo editor, email and SMS content types, a campaign object grouping multi-channel assets, an analytics dashboard (production stats and content-mix actual-vs-target; engagement metrics populate once each platform's insights API access is approved), multi-tenant orgs/brand kits/brand-doc import with lockable fields, Stripe billing (seat-based plans, checkout, customer portal, webhooks, usage metering — verified end to end in production per the checklist), social OAuth with a publish queue and manual-export fallback, lead capture and revenue attribution (post → click → lead → deal), MLS import and saved-listing refresh, white-label theming for brokerages, and a reel/video engine that produces a storyboard today and an actual MP4 once a video provider is configured.
Source: `docs/CHECKLIST.md` "Shipped", `README.md` "Status"

## Planned functionality

- **Stories/Reels publishing endpoints** — blocked on Meta/LinkedIn app review, not a build gap.
- **Auto-refresh of price/status for saved MLS listings** — noted as future work; today's saved listings are a snapshot from import time.
- **Staff cross-org feedback triage view** — the customer-facing per-org feedback status view exists; a staff-side view across all orgs is future work.

Source: `docs/CHECKLIST.md` "Build backlog" (parenthetical "future" notes) and "Known gates"

**Note on `docs/PRODUCT_ROADMAP.md`:** that document described a much larger gap (billing, lead capture, revenue attribution, and the video engine all listed as "not built") as of its last update. `docs/CHECKLIST.md` shows all of those have since shipped. `docs/PRODUCT_ROADMAP.md` is stale rather than a current plan and should not be read as this project's roadmap; it is being retired rather than merged in, since merging stale content forward would misrepresent current scope.

## Out of scope

UNKNOWN — no explicit "we will not build this" list exists in the repository. The closest evidence is `README.md`'s "External gates" note that live social posting and the analytics/attribution features that depend on it are gated on third-party approval rather than a product decision not to build them, which is a different thing from being out of scope.

## Business rules

- **Fair Housing compliance is enforced at publish time, not just at generation time.** A post tied to a campaign whose `copy.compliance_notes` array is non-empty cannot be published unless the caller explicitly passes `overrideCompliance: true`.
  Source: `lib/social/publish.ts` (`publishPost`)
  **UNVERIFIED / flagged, not just cited:** the publish API route (`app/api/posts/[id]/publish/route.ts`) accepts `overrideCompliance` from the request body with no server-side check that the caller holds an admin/owner role — the code comment describes this as "admin acted on the flagged notes," but nothing in the route or `getOrgContext()` call enforces that. Any authenticated org member who can call this endpoint can currently override the gate. This is stated as a business-rule gap here and repeated as a finding in `SECURITY.md`; it was traced to the exact line, not inferred.
- **No plan is unlimited.** Every paid plan has a finite AI-credit allowance and a finite included-seat count; usage beyond the block is either blocked or billed per additional seat.
  Source: `lib/billing/plans.ts`, `docs/PRICING.md` "Model"
- **Pricing figures: UNVERIFIED which numbers are currently live.** `docs/PRICING.md` states the current model is Solo $59/mo, Team $399/mo base (10 seats) + $39/additional seat, Brokerage $899/mo base (25 seats) + $32/additional seat. `docs/CHECKLIST.md`, under owner setup tasks, lists creating those exact recurring Stripe prices as still unchecked, open work ("Pricing repackaged (action needed)... The old Starter/Pro/Team/Brokerage $49/$99/$249/$499 prices are superseded"). These two documents disagree on whether the new pricing is live in Stripe today or still pending setup. This document takes no position on which is correct — confirm directly against the Stripe dashboard (which prices exist and are attached to active subscriptions) before treating either figure as current.
- **A brokerage can lock brand fields** (logo, colors, fonts, disclaimer) so member agents cannot override them; unlocked fields let a member layer their own values on top of the org's.
  Source: `supabase/migrations/0001_init.sql` (`brand_kits.locked_fields`), `lib/branding/resolveBrand.ts`

## Terminology

| Term | Meaning here |
|---|---|
| Org | The tenant boundary. A brokerage is an org with many members; a solo agent is an "org of one," auto-created at signup. |
| Brand kit | The set of colors, fonts, logo, disclaimer, and layout theme applied to generated content. Can be owned by an org (brokerage-wide) or a membership (an individual's own or personal-layer kit). |
| Campaign | A generated content package tied to one listing: a type (just sold, new listing, open house, custom), the AI-generated copy, the rendered graphic, and the posts derived from it. Distinct from `marketing_campaigns`, a separate table grouping multi-channel assets (social + email + SMS) under one named strategy. |
| Compliance notes | Fair Housing review flags attached to generated copy (`campaigns.copy.compliance_notes`); a non-empty list blocks publishing until resolved or explicitly overridden. |
| Manual export | The fallback publishing path (download the rendered image, copy the caption) used when a social platform isn't connected or isn't yet approved for live posting; UI-identical to live publishing. |
| Stub provider | The default, no-cost implementation of the pluggable image/video provider interfaces; produces no real AI image or rendered video until a paid provider (`OPENAI_API_KEY`+`IMAGE_PROVIDER=openai`, or `SHOTSTACK_API_KEY`+`VIDEO_PROVIDER=shotstack`) is configured. |

## Constraints

- **Meta/LinkedIn app review** gates live Instagram/Facebook/LinkedIn posting for any account other than an app-role tester; this is an external timeline the team doesn't control.
  Source: `README.md` "External gates", `docs/INTEGRATIONS.md`
- **Vercel Hobby plan caps cron frequency to daily**, meaning the publish queue can only run once per day on that plan tier; a Pro plan is needed for more frequent (near-real-time) scheduled publishing.
  Source: `docs/CHECKLIST.md` "Known gates", `docs/DEPLOYMENT.md`
- **AI provider rate limits and account credit balance** are the real throughput ceiling for content generation, not the application's own code.
  Source: `README.md`, `docs/OPERATIONS.md` "Generation failures"

## Success criteria

UNKNOWN — no explicit, measurable success criteria (target user count, revenue target, retention target) are documented in this repository. `docs/SCALABILITY.md` frames a specific question ("can Marquee handle ~100 users") and answers it affirmatively for browsing/CRUD load, which is a capacity finding, not a stated business success criterion.
