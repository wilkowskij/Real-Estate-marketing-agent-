# Integrations

Every external service the app calls, why, and what happens when it isn't configured. See `.env.example` for the exact variable names and `docs/DEPLOYMENT.md` for how these are set per environment.

## Supabase — database, auth, storage

**Purpose:** primary Postgres database (with Row Level Security), user authentication and session management, and private file storage for listing photos and brand assets.
**Data sent/received:** all application data; auth tokens/session cookies; uploaded media files.
**Auth method:** anon key (browser-safe) for client reads under RLS; service role key (server-only, never `NEXT_PUBLIC_`) for cron jobs and OAuth token writes that need to bypass RLS.
**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
**Source files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
**Failure behavior:** UNVERIFIED — not exercised in this pass (would require simulating a Supabase outage). The app has no documented fallback; Supabase being unreachable takes down auth and all data access.
**Rate limits:** UNKNOWN — depends on the Supabase project's plan tier, not documented in this repo.
**System of record:** yes, for all application data.

## Anthropic Claude API — content generation agents

**Purpose:** powers the Marketing, Messaging, Design, and Orchestrator agents that write copy, plan the content calendar, and select formats.
**Data sent:** listing details, brand voice/market area context, prior campaign copy (for consistency); no customer PII beyond what a listing/campaign already contains.
**Data received:** generated copy (headline, caption, CTA, hashtags, compliance notes), calendar plans.
**Auth method:** API key.
**Env vars:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_FAST_MODEL`
**Source files:** `lib/anthropic/client.ts`, `lib/agents/marketing.ts`, `lib/agents/messaging.ts`, `lib/agents/design.ts`, `lib/agents/orchestrator.ts`, `lib/agents/calendar.ts`
**Failure behavior:** README states calls 400 on an empty API credit balance; no other retry/fallback behavior was traced in this pass.
**Rate limits:** UNKNOWN, governed by the Anthropic account's own tier.
**System of record:** no — Claude is called per-request; generated copy is persisted to `campaigns.copy` in Supabase, which is then the record.

## OpenAI — optional AI image generation

**Purpose:** photo enhancement / from-scratch image generation via `gpt-image-1`, used only when explicitly enabled.
**Data sent:** a text prompt and/or a source photo to enhance.
**Data received:** a generated or enhanced image.
**Auth method:** API key.
**Env vars:** `IMAGE_PROVIDER` (must be `openai` to activate; default `stub` never calls OpenAI), `IMAGE_PROVIDER_API_KEY`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`
**Source files:** `lib/design/imageProvider.ts`
**Failure behavior:** UNVERIFIED — not exercised; provider-interface code exists but the failure path wasn't traced.
**Rate limits:** UNKNOWN.
**System of record:** no — output is stored as an `assets` row once generated.

## Shotstack — optional video rendering

**Purpose:** renders an MP4 from a reel storyboard. The `stub` default (no key required) returns a shot list only, with no actual video file.
**Data sent:** a storyboard (scene list, timing, asset references).
**Data received:** a rendered video file or render job status.
**Auth method:** API key, plus an environment selector.
**Env vars:** `VIDEO_PROVIDER` (must be `shotstack` to activate), `SHOTSTACK_API_KEY`, `SHOTSTACK_ENV` (`stage` sandbox or `v1` production)
**Source files:** `lib/video/videoProvider.ts`, `lib/video/storyboard.ts`
**Failure behavior:** UNVERIFIED — not exercised against the real Shotstack API in this pass.
**Rate limits:** UNKNOWN.
**System of record:** no.

## RentCast — MLS listing data

**Purpose:** "Import from MLS" on the Create screen; also powers a scheduled price/status refresh for previously-imported listings.
**Data sent:** an address or search query.
**Data received:** listing details (price, beds, baths, sqft, status).
**Auth method:** API key.
**Env vars:** `RENTCAST_API_KEY`
**Source files:** `lib/listings/rentcast.ts`, `lib/listings/refresh.ts`, `app/api/listings/search/route.ts`, `app/api/listings/[id]/refresh/route.ts`, `app/api/cron/refresh-listings/route.ts`
**Failure behavior:** UNVERIFIED — not exercised in this pass.
**Rate limits:** UNKNOWN, governed by the RentCast plan.
**System of record:** yes, for listing data at the moment of import/refresh — a `listings` row is a snapshot, not a live sync; it only updates when the refresh cron or a manual refresh runs.

## Resend — transactional email

**Purpose:** sends lead-capture notification emails and the open-house packet email. Also, separately, Supabase Auth's own signup-confirmation email uses a branded HTML template configured directly in the Supabase dashboard (not sent via Resend) — see "Branded confirmation email" below.
**Data sent:** recipient address, rendered email HTML/text.
**Data received:** send status.
**Auth method:** API key.
**Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
**Source files:** `lib/email/client.ts`, `lib/email/templates/openHousePacket.ts`, `app/api/leads/capture/route.ts`
**Failure behavior:** confirmed by code comment/design — leaving `RESEND_API_KEY` blank skips sending with no error thrown, rather than failing the request.
**Rate limits:** UNKNOWN, governed by the Resend plan.
**System of record:** no — Resend is a delivery mechanism; nothing reads email state back.

### Branded confirmation email (Supabase Auth, not Resend)

The signup confirmation email is templated directly in the Supabase dashboard rather than sent through Resend, because Supabase's own auth email templates can't be set from application code.

**Setup (one-time, Supabase dashboard):**
1. **Auth → URL Configuration** — set **Site URL** to the production domain (this is what `{{ .SiteURL }}` resolves to in the email), and add `<production-domain>/auth/confirm` under **Redirect URLs**.
2. **Auth → Email Templates → "Confirm signup"** — set the subject and paste the contents of `docs/email-templates/confirm-signup.html` as the message body.

**How it works in code:** `components/AuthForm.tsx` calls `signUp` with `emailRedirectTo: <origin>/auth/confirm?next=/dashboard`. The email button links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`. `app/auth/confirm/route.ts` calls `verifyOtp({ type, token_hash })`, which sets the session cookie, then redirects to `next` (default `/dashboard`); an invalid/expired link redirects to `/login?verify=failed`.
Source: `components/AuthForm.tsx`, `app/auth/confirm/route.ts`, `docs/email-templates/confirm-signup.html`

The same pattern applies to Supabase's password-recovery and invite emails — brand those templates the same way, pointed at `/auth/confirm` with the matching `type` (`recovery`, `invite`). UNVERIFIED: whether those two have actually been branded yet, versus only signup.

## Notion — feedback mirror (optional)

**Purpose:** in-app feedback is always stored in Postgres; when configured, it's also mirrored into a Notion database for triage.
**Data sent:** feedback text, type/status, and email when present.
**Data received:** none — write-only mirror.
**Auth method:** internal integration API key, scoped to a database shared with that integration.
**Env vars:** `NOTION_API_KEY`, `NOTION_FEEDBACK_DB_ID`
**Source files:** `lib/notion/feedback.ts`, `app/api/feedback/route.ts`
**Failure behavior:** UNVERIFIED — not exercised; presumably the Postgres write still succeeds independent of the Notion mirror, but this wasn't traced in code.
**Rate limits:** UNKNOWN.
**System of record:** no — Postgres `feedback` table is the system of record; Notion is a read-side mirror for humans.

## Stripe — billing

**Purpose:** subscription checkout, customer portal, and webhook-driven subscription state sync.
**Data sent:** checkout session parameters, customer/subscription lookups.
**Data received:** webhook events (subscription created/updated/canceled, invoice events).
**Auth method:** secret key for API calls; a separate webhook signing secret to verify inbound webhook authenticity.
**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BROKERAGE`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_BROKERAGE_SEAT` (the five price IDs are read dynamically via a variable-keyed lookup in `lib/billing/plans.ts`, not a literal reference — see `scripts/check-env.mjs`)
**Source files:** `lib/billing/stripe.ts`, `lib/billing/subscription.ts`, `lib/billing/plans.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, `app/api/webhooks/stripe/route.ts`
**Failure behavior:** README states routes return 503 when `STRIPE_SECRET_KEY` is blank, rather than erroring.
**Rate limits:** UNKNOWN, governed by the Stripe account.
**System of record:** yes, for actual billing/payment state. `subscriptions`/`usage_records`/`billing_events` in Postgres are a synced mirror (see `docs/DATA_MODEL.md`).
**Webhooks:** `app/api/webhooks/stripe/route.ts` receives and verifies Stripe webhook events using `STRIPE_WEBHOOK_SECRET`; events are deduplicated via `billing_events.stripe_event_id`.

## Social platforms — Instagram, Facebook, LinkedIn, X (Twitter)

**Purpose:** OAuth-connect a per-person or per-org social account and publish generated content directly, or fall back to manual export (download image + copy caption) when a platform isn't connected or isn't yet approved for live posting.
**Data sent:** OAuth authorization requests; on publish, the caption and media URL(s).
**Data received:** OAuth tokens (access + refresh where applicable); on publish, a platform post ID or an error.
**Auth method:** OAuth 2.0 per platform. Tokens are encrypted before storage (`lib/social/crypto.ts`) and never exposed to the browser.
**Env vars:** `NEXT_PUBLIC_APP_URL` (all — the OAuth callback URL is built from this), `SOCIAL_TOKEN_ENC_KEY` (all — 32-byte base64, encrypts stored tokens), `META_APP_ID`/`META_APP_SECRET` (Instagram + Facebook, same Meta app powers both), `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`, `TWITTER_CLIENT_ID`/`TWITTER_CLIENT_SECRET`
**Source files:** `lib/social/oauth.ts`, `lib/social/crypto.ts`, `lib/social/publisher.ts`, `lib/social/publishers/meta.ts`, `lib/social/publishers/linkedin.ts`, `lib/social/publishers/twitter.ts`, `app/api/social/connect/[platform]/route.ts`, `app/api/social/callback/[platform]/route.ts`
**Failure behavior:** if a platform isn't configured, `Connect` returns a friendly 503 and the publish queue falls back to manual export rather than erroring.
**Rate limits:** UNKNOWN, governed by each platform's API.
**System of record:** no — the platform is the system of record for whether a post is actually live; `posts.state`/`platform_post_id` in Postgres track what this app believes happened.
**Webhooks:** none for these three; OAuth callbacks only.

**App-review gating:** Instagram and Facebook publishing require Meta Business Verification and App Review (scopes `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`) before any agent other than a role-added tester can connect and post live; until approved, publishing falls back to manual export. X/Twitter and LinkedIn do not require an equivalent review for basic posting once OAuth is configured.
Source: `README.md` "Status", verified against `lib/social/publishers/meta.ts` scopes referenced in code comments

**Setup, per platform** (create a developer app, get credentials, set the callback URL, paste env vars into the hosting provider, redeploy):

- **Instagram** (via Meta Graph API) — requires converting to a Professional/Business IG account linked to a Facebook Page, then creating a Meta app with the Facebook Login + Instagram products, redirect URIs at `<domain>/api/social/callback/instagram` and `/api/social/callback/facebook`, and copying the App ID/Secret into `META_APP_ID`/`META_APP_SECRET`. Testing works immediately for accounts added as an App Role (Admin/Tester); public use needs Business Verification + App Review.
- **Facebook (Pages)** — same Meta app as Instagram; scopes `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, also App-Review gated.
- **X/Twitter** — developer.twitter.com → create a Project + App, enable OAuth 2.0 (Web App/Confidential client), scopes `tweet.read tweet.write users.read offline.access`, redirect URL `<domain>/api/social/callback/twitter`, copy Client ID/Secret into `TWITTER_CLIENT_ID`/`TWITTER_CLIENT_SECRET`. No review required for basic posting.
- **LinkedIn** — linkedin.com/developers → create an app tied to a Company Page, add "Sign In with LinkedIn using OpenID Connect", request the Community Management API for `w_member_social` (posting), redirect URL `<domain>/api/social/callback/linkedin`, copy Client ID/Secret into `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`.

**Two things that will break OAuth if missed, both project-specific rather than general Next.js/Vercel behavior:**
- `NEXT_PUBLIC_APP_URL` must be the **stable** production alias, not a per-deploy preview URL — the callback URL is built from this value, and per-deploy URLs change on every push.
- Vercel's **Deployment Protection → Vercel Authentication**, if turned on, puts every route (including the OAuth callback routes and public lead pages) behind a login wall, causing the platform's redirect back to the app to 403. It must be off for Production, or the app needs a custom domain that isn't protected.

## Vercel — hosting, cron, OG image rendering

**Purpose:** hosts the Next.js app (serverless/Fluid Compute), runs the five scheduled cron jobs, and `@vercel/og` renders deterministic, brand-driven social graphics at request time.
**Data sent/received:** N/A — this is the hosting platform itself, not a third-party API call from within request handling (except `@vercel/og`, which runs in-process).
**Env vars:** none specific to Vercel itself; all app env vars are set in Vercel's dashboard for the running app (see `docs/DEPLOYMENT.md`).
**Source files:** `vercel.json`, `lib/design/render.tsx`
**Failure behavior:** N/A.
**System of record:** N/A — this is infrastructure, not a data integration.

---

## ops-agents — a separate integration surface

`ops-agents/` is a standalone internal tool (see `docs/decisions/0005-ops-agents-standalone-service.md`) with its own external services, listed here for completeness since they live in this repository, but they are **not** part of the product app's runtime:

| Service | Purpose | Env vars | Optional? |
|---|---|---|---|
| Slack (Bolt, Socket Mode) | The bot's own transport | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_*_CHANNEL` (×5) | No — required for the bot to run at all |
| Anthropic Claude Agent SDK | The four agents' reasoning | `ANTHROPIC_API_KEY` | No |
| GitHub API | Dev agent — issues/PRs | `GITHUB_TOKEN`, `GITHUB_REPO` | Yes — tool only registers if the token is set |
| Sentry | Dev agent — recent production errors | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Yes |
| Linear | PM + Support agents — backlog/bug filing | `LINEAR_API_KEY` | Yes |
| Notion | Support agent — internal knowledge base search (separate integration from the product app's feedback mirror above) | `NOTION_API_KEY` | Yes |
| This product app, as an HTTP client | Marketing agent dogfoods the live product's `/api/campaigns/generate` | `PRODUCT_API_URL`, `PRODUCT_API_TOKEN` | Yes |

Source: `ops-agents/README.md`, `ops-agents/src/tools/*`, `ops-agents/.env.example`
