# Open Items Checklist

A living checklist of what's left. Tick a box (`[ ]` → `[x]`) and commit as you
go. Grouped by **who owns it**: 🧑 = you (manual/dashboard work), 🤖 = build work
(ask Claude). Last updated: 2026-06-04.

---

## 🧑 Your setup tasks (required before going live)

### Stripe billing (code is built — needs your account wiring)
- [x] Create a Stripe account (or use existing) and switch to **live mode** when ready
- [ ] **Pricing repackaged (action needed):** create the new recurring prices —
      Solo $59, Team $399 (base, 10 seats), Brokerage $899 (base, 25 seats), plus
      two per-additional-user prices: Team seat $39, Brokerage seat $32.
      See [`docs/PRICING.md`](PRICING.md). (The old Starter/Pro/Team/Brokerage
      $49/$99/$249/$499 prices are superseded.)
- [ ] Update env vars in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_TEAM_SEAT`,
      `STRIPE_PRICE_BROKERAGE`, `STRIPE_PRICE_BROKERAGE_SEAT`
- [x] Add the webhook endpoint in Stripe → `https://<your-domain>/api/webhooks/stripe`
      (events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`)
- [x] Enable the Stripe **Customer Portal** (Billing → Customer portal settings)
- [x] Test a checkout end-to-end from `/company/subscription` — Professional plan
      verified in DB (`subscriptions.plan=pro`, `status=active`, `orgs.plan=pro`,
      `current_period_end` set; full billing-event chain captured)

### Social OAuth apps (code is built — needs platform credentials + review)
- [ ] **Meta** (Instagram + Facebook): create app, request `instagram_content_publish`,
      `pages_manage_posts`, etc.; complete App Review + business verification
- [ ] Add `META_APP_ID`, `META_APP_SECRET` to Vercel
- [ ] **LinkedIn**: create app, request Community Management API access (`w_member_social`)
- [ ] Add `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` to Vercel
- [ ] **X / Twitter**: create app in the developer portal, enable OAuth 2.0,
      set the callback URL `https://<your-domain>/api/social/callback/twitter`
- [ ] Add `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` to Vercel
- [ ] Set each app's redirect/callback URL to `…/api/social/callback/<platform>`
- [ ] Connect one account per platform from `/profile/connections` and verify a test post

### Core env / infra (one-time)
- [ ] Confirm `SOCIAL_TOKEN_ENC_KEY` (32-byte base64) is set in Vercel
- [ ] Confirm `CRON_SECRET` is set in Vercel (cron auth)
- [ ] Confirm `OPENAI_API_KEY` + `IMAGE_PROVIDER=openai` set (AI image generation)
- [ ] Confirm `NEXT_PUBLIC_APP_URL` matches the production domain

### Optional integrations (code is built — wire when you want them)
- [ ] **MLS listing import:** add `RENTCAST_API_KEY` in Vercel to enable
      "Import from MLS" on Create (searches your configured market state).
- [ ] **Support/feedback → Notion:** add `NOTION_API_KEY` + `NOTION_FEEDBACK_DB_ID`
      in Vercel and share the Notion DB with your integration. Without them,
      feedback still saves to the `feedback` table. See [`.env.example`](../.env.example).

### Smoke test the live app
- [ ] Sign up → auto-creates a solo org
- [ ] Company → Brand & documents: upload a brand guide, set colors/logo
- [ ] Profile → My details: add headshot, name, license, phone
- [ ] Create: generate a Just Sold campaign (photo upload **and** AI-image path)
- [ ] Verify the rendered graphic + caption look on-brand
- [ ] Calendar: generate a 30-day plan
- [ ] Company → Agents: invite a second agent (team flow)

---

## 🤖 Build backlog (PRD phases — ask Claude to pick these up)

### Shipped ✅
- [x] AI content engine (10 campaign types, format-aware copy)
- [x] AI image generation + photo editor
- [x] Multi-tenant orgs/agents, brand kit, brand-doc import, locks
- [x] Social OAuth + publishers + publish queue (per-person connections, IG/FB/LI/X)
- [x] Stripe billing module (plans, checkout, portal, webhooks, usage metering)
- [x] Simplified UI → Company + Profile hubs
- [x] **MLS import (RentCast)** — "Import from MLS" on Create searches active /
      recently-sold listings by address/ZIP/city and pre-fills every field, so a
      campaign is ~2 clicks. Needs `RENTCAST_API_KEY`.
- [x] **Stripe verified end-to-end** in production (checkout → webhook → DB)
- [x] **Email + SMS content types** (Messaging Agent, channel switcher, previews,
      Stop Slop, usage-metered)
- [x] **Stop Slop quality gate** — flags real-estate clichés + missing local
      specificity on generated social/email/SMS copy (no extra LLM call)
- [x] **Post preview drawer** on the calendar queue — click a post to view media,
      edit caption, reschedule, approve/publish inline
- [x] **Content mix settings** on Plan 30 days — per-bucket sliders (educational /
      community / listings / social proof / personal brand) + post-count control
- [x] **Speech-to-text dictation** on the Create brief (Web Speech API)
- [x] **Photo UX** — client-side resize (fixes 4.5 MB upload 413), multi-upload,
      per-thumbnail delete
- [x] **Market area selection** — state + county + region + key towns per
      brand kit (`brand_kits.market_area` jsonb, layers + locks like other
      brand fields). Drives local expertise, hashtags, Stop Slop local-terms,
      image prompts, and the calendar planner — no more hardcoded Monmouth/NJ.
- [x] **MLS selection + market-aware listing pull** — agents pick the MLS they
      belong to in Brand settings (free text + common-MLS suggestions, stored in
      `market_area`); "Import from MLS" defaults a city search to the agent's
      configured state and labels which MLS/area results came from.
- [x] **In-app support & feedback → Notion** — footer widget on every page for
      bug reports / feedback / feature requests; stored org-scoped in `feedback`
      (RLS) and best-effort mirrored into a Notion DB for triage/prioritization.

### Next up (net-new pillars)
- [x] **Email + SMS** content types in the marketing agent — channel switcher on
      Create (Social / Email / SMS), Messaging Agent reuses cached local
      expertise, inbox + iMessage previews, Stop Slop applied, usage-metered
- [x] **Campaign object** grouping multi-channel assets (name + strategy + posts)
      — `marketing_campaigns` + `campaign_messages` tables (RLS), `/campaigns`
      hub + detail page, attach social posts from the queue drawer, save
      generated email/SMS into a campaign from Create
- [x] **Analytics engine** — `social_metrics` table + per-platform fetcher
      framework + daily refresh cron + `/analytics` dashboard (production stats
      + content-mix actual-vs-target now; engagement populates once a platform's
      insights API is approved)
- [x] **Lead capture / CRM** — `lead_forms` + `leads` tables (RLS), public
      `/l/<slug>` landing pages + open-house sign-in, QR codes + shareable links,
      public capture API (service-role, honeypot), `/leads` hub with a status
      pipeline (new → contacted → qualified → won/lost)
- [x] **Revenue attribution** — post → click → lead → deal. `deals` +
      `tracked_links` tables (RLS), public `/r/<slug>` redirect with atomic
      click counting, convert-lead-to-deal + deals pipeline in the Leads hub,
      per-campaign tracked links in campaign detail, and a Revenue & attribution
      section in Analytics (funnel + closed revenue by source)
- [ ] **Video marketing engine** — scene detect → clips → reels (Shotstack + scene AI)
- [ ] **Stories / Reels** publishing endpoints
- [ ] **Saved listings from MLS** — persist an imported RentCast listing as a
      reusable `listings` record (tie it to campaigns, leads & deals; "My
      listings" picker on Create) and auto-refresh price/status changes.
      *(Natural next step — builds directly on the MLS import + market-area work;
      no external blockers.)*
- [ ] **MLS attribution in generated copy** — feed the agent's configured MLS +
      brokerage disclaimer into the marketing agent so Just Sold / New Listing
      posts can carry compliant "Listing courtesy of…" attribution.
- [ ] **Feedback triage in-app** — `/feedback` (or a Company tab) reading the
      `feedback` table with a status pipeline (new → triaged → planned → done),
      optionally syncing status back to Notion + pinging the ops-agents bot.
- [ ] **White-label theming** for brokerages
- [x] Brokerage-wide "who's connected" view — Company → Connections: per-agent
      × platform coverage matrix, per-platform coverage bars, and company-owned
      accounts (read-only; connecting stays per-agent)
- [x] Mobile sidebar nav — hamburger + slide-over drawer (desktop sidebar unchanged)

---

## ⚠️ Known gates / notes
- Live social posting is **blocked on Meta/LinkedIn app review** (weeks). Until then,
  posts fall back to **manual export** (download image + copy caption) — the queue
  and UI are identical, so approval just flips a platform live.
- Vercel **Hobby** plan caps cron to daily; the publish queue runs daily there.
- `billing_events` table is intentionally service-role-only (audit table, no RLS policy).
