# Open Items Checklist

A living checklist of what's left. Tick a box (`[ ]` → `[x]`) and commit as you
go. Grouped by **who owns it**: 🧑 = you (manual/dashboard work), 🤖 = build work
(ask Claude). Last updated: 2026-06-02.

---

## 🧑 Your setup tasks (required before going live)

### Stripe billing (code is built — needs your account wiring)
- [x] Create a Stripe account (or use existing) and switch to **live mode** when ready
- [x] Create 4 recurring products/prices: Starter $49, Pro $99, Team $249, Brokerage $499
- [x] Add env vars in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BROKERAGE`
- [x] Add the webhook endpoint in Stripe → `https://<your-domain>/api/webhooks/stripe`
      (events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`)
- [ ] Enable the Stripe **Customer Portal** (Billing → Customer portal settings)
- [ ] Test a checkout end-to-end from `/company/subscription`

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

### Next up (net-new pillars)
- [x] **Email + SMS** content types in the marketing agent — channel switcher on
      Create (Social / Email / SMS), Messaging Agent reuses cached local
      expertise, inbox + iMessage previews, Stop Slop applied, usage-metered
- [ ] **Campaign object** grouping multi-channel assets (name + strategy + posts)
- [ ] **Analytics engine** — pull platform insights, store `social_metrics`
- [ ] **Lead capture / CRM** — landing pages, forms, QR, open-house, `leads` table
- [ ] **Revenue attribution** — post → click → lead → deal (`opportunities`, `deals`)
- [ ] **Video marketing engine** — scene detect → clips → reels (Shotstack + scene AI)
- [ ] **Stories / Reels** publishing endpoints
- [ ] **White-label theming** for brokerages
- [ ] Brokerage-wide "who's connected" view (team social coverage)
- [ ] Mobile sidebar nav (currently desktop-only)

---

## ⚠️ Known gates / notes
- Live social posting is **blocked on Meta/LinkedIn app review** (weeks). Until then,
  posts fall back to **manual export** (download image + copy caption) — the queue
  and UI are identical, so approval just flips a platform live.
- Vercel **Hobby** plan caps cron to daily; the publish queue runs daily there.
- `billing_events` table is intentionally service-role-only (audit table, no RLS policy).
