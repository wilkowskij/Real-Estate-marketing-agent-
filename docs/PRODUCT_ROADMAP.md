# Implementation Plan — Master PRD → Product Roadmap

How to evolve the current **Marquee** app into the **Real Estate Marketing
Operating System** described in the Master Product Strategy PRD.

This maps the PRD's 8 modules + monetization onto what we've already shipped,
flags the genuinely hard new pieces, and sequences the work so each phase is
shippable and revenue-generating.

---

## 1. Where we are vs. the PRD (honest gap analysis)

| PRD capability | Status today | Gap |
| --- | --- | --- |
| AI content engine (FB/IG/LI posts, descriptions, market updates) | ✅ **Built** — marketing agent, 10 campaign types, format-aware (reel/carousel/infographic) | Add email + SMS copy types |
| AI campaign builder (name, strategy, content) | 🟡 **Partial** — per-post generation + 30-day calendar planner | No "campaign" object grouping multi-channel assets |
| Social publishing (FB/IG/LI, schedule, stories/reels) | 🟡 **Built, gated** — OAuth + publishers + queue done; **blocked on Meta/LinkedIn app review** | Stories/Reels publishing endpoints; TikTok/YouTube/GBP later |
| AI image generation + photo editor | ✅ **Built** — generate-from-scratch + enhance + canvas editor | — |
| Brand/multi-tenant (org → agents, locks, brand-doc import) | ✅ **Built** — strong foundation for teams/brokerages | White-label theming for brokerages |
| Analytics engine (reach, impressions, clicks…) | ❌ **Not built** | Pull platform insights; store `social_metrics` |
| Marketing intelligence (recommendations) | 🟡 **Seeded** — orchestrator judges topics; calendar uses best-times | Needs real metrics to analyze |
| Lead capture (landing pages, QR, open-house, CRM) | ❌ **Not built** | New module: pages, forms, `leads` table |
| Revenue attribution (post→click→lead→deal) | ❌ **Not built** — the headline differentiator | New module: tracking, `opportunities`, `deals` |
| **Video marketing engine** (scene detect → clips → reels) | ❌ **Not built** — the biggest new lift | Needs a video pipeline (Shotstack + scene AI) |
| **Stripe billing / plans / usage credits** | ❌ **Not built** — gates everything commercial | New module: subscriptions, metering, webhooks, portal |
| Reporting dashboard (MRR/ARR, attribution) | 🟡 **Partial** — dashboard exists; `agent_runs` has cost | Needs billing + attribution data |

**Takeaway:** The content/branding/publishing core (~Modules 1–4 partial) is
largely done. The four big net-new pillars are **Stripe billing**, **Lead
capture + CRM**, **Revenue attribution**, and the **Video engine**. Attribution
is the stated North Star and differentiator; Stripe is the prerequisite to
charging anyone.

---

## 2. Architecture fit

The existing stack absorbs most of this without re-platforming:
- **Multi-tenant orgs + RLS** already model Solo / Team / Brokerage. Add a
  `plan`/seat concept on `orgs` (the column already exists) gated by Stripe.
- **Supabase** holds the new tables (`leads`, `opportunities`, `deals`,
  `subscriptions`, `usage_records`, `social_metrics`, `videos`, …) under the
  same org-scoped RLS pattern.
- **Vercel** hosts the new API routes + webhooks; **Vercel Cron** already runs
  publish/refresh — add metrics-pull and usage-rollup jobs.
- **Pluggable provider pattern** (we use it for `ImageProvider`) extends cleanly
  to a `VideoProvider` (Shotstack) and `SmsProvider` (Twilio).

New external dependencies the PRD introduces: **Stripe** (billing), **Shotstack**
(video render), **Twilio** (SMS), and **Meta/LinkedIn Insights** APIs (analytics).

---

## 3. Phased roadmap

### Phase 1 — Monetization + the commercial core  *(highest priority)*
Make it sellable. Nothing else matters commercially until billing exists.
1. **Stripe billing**
   - Products/prices: `starter $49`, `pro $99`, `team $249`, `brokerage $499`
     (+ optional annual at 15–20% off).
   - Checkout + **Customer Portal** (upgrade/downgrade/cancel/invoices).
   - **Webhooks** (`checkout.session.completed`, `customer.subscription.*`,
     `invoice.paid`, `invoice.payment_failed`) → write `subscriptions` +
     `billing_events`; set `orgs.plan` and seat limits.
   - **Plan gating middleware**: feature/seat checks keyed to the org's plan.
2. **Usage metering scaffold** — `usage_records` table + a meter helper; start
   by recording AI generations (we already log `agent_runs.cost_usd`). Bill AI
   credits later via Stripe metered prices.
3. **Email + SMS content types** in the existing content engine (cheap win;
   reuses the marketing agent). SMS *sending* waits for Twilio in Phase 3.

*Ship = the app can take money and enforce plans.*

### Phase 2 — Analytics + close the publishing loop
1. **Unblock live publishing**: finish Meta App Review + LinkedIn access
   (external, in-flight), add **Stories/Reels** publish endpoints.
2. **Analytics engine**: cron pulls per-post insights (reach/impressions/
   clicks/engagement) from Meta/LinkedIn into `social_metrics`; show on a
   post-performance view + dashboard.
3. **Campaign object**: group multi-channel assets under one campaign (name +
   strategy) — upgrades the current per-post model to the PRD's Module 1.

### Phase 3 — Lead capture + CRM + Video
1. **Lead capture**: hosted **landing pages** per listing/campaign, **QR codes**,
   open-house sign-in; `leads` table + a lightweight CRM list view.
2. **Video marketing engine** (the big build): upload walkthrough →
   scene detection + highlight selection (AI) → clip generation →
   auto-captions → branding → render via **Shotstack** → publish as Reels/
   Shorts/Stories. New tables: `videos`, `video_scenes`, `generated_clips`.
   Long-running → use a job queue (Vercel Queues/Workflow) + render credits.
3. **Twilio SMS** sending for lead follow-up + SMS credits metering.

### Phase 4 — Attribution + intelligence (the North Star)
1. **Revenue attribution engine**: tracked links/UTMs + pixel/QR →
   `post → click → lead → appointment → opportunity → closed deal`. Tables:
   `opportunities`, `deals`; attribution joins post → revenue.
2. **Reporting dashboard**: MRR/ARR/churn/ARPU (from Stripe) + marketing +
   sales + **revenue-by-post/platform/campaign**.
3. **AI optimization engine**: analyze `social_metrics` + attribution to make
   predictive posting recommendations and revenue forecasts (now there's real
   data to learn from — this is where the deferred web-research/trends also pays
   off).

---

## 4. Data model additions (incremental migrations)

Layer onto the current schema, all org-scoped with RLS:
- **Billing:** `subscriptions`, `usage_records`, `billing_events`
- **Campaign grouping:** `campaigns` gains a parent campaign or add `campaign_groups`
- **Analytics:** `social_metrics` (post_id, metric, value, captured_at)
- **Leads/CRM:** `leads`, `opportunities`, `deals`
- **Video:** `videos`, `video_scenes`, `generated_clips`

(The PRD's `organizations`/`users`/`social_accounts`/`social_posts` already
exist as `orgs`/`auth.users`+`profiles`/`social_accounts`/`posts`.)

---

## 5. Sequencing rationale & risks

- **Stripe first** — it's the smallest high-leverage build and unlocks revenue;
  everything else can iterate behind paid plans.
- **Attribution is the moat but comes last** — it depends on publishing analytics
  *and* lead data existing first. Building it earlier would have nothing to join.
- **Video is the largest single lift** and depends on a job-queue + a paid render
  vendor; isolate it so it doesn't block billing/analytics.
- **External gating risk:** live social publishing + insights both depend on
  Meta/LinkedIn approvals (weeks). Phase 1 (billing) deliberately doesn't depend
  on them, so revenue isn't blocked by platform review.
- **Cost control:** AI + video + SMS are metered costs — wire `usage_records`
  early so margins are visible before usage scales.

---

## 6. Suggested first sprint (concrete)

1. Stripe account + 4 products/prices; `STRIPE_*` env vars.
2. `subscriptions` + `billing_events` migrations; `orgs.plan` enforcement helper.
3. `/api/billing/checkout` + `/api/billing/portal` + `/api/webhooks/stripe`.
4. Pricing page + "Upgrade" in settings; gate one feature (e.g. seats / AI volume)
   by plan to prove the loop end-to-end.
5. Add `email` + `sms` content types to the marketing agent.

That delivers a **billable product** on top of the marketing engine already live.
