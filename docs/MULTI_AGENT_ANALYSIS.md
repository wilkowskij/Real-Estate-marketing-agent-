# Multi-Agent Testing Analysis
## Real Estate Marketing Agent — Feature Gap & Competitive Review
*Generated: June 10, 2026*

---

## Table of Contents

1. [Current State of the App](#1-current-state-of-the-app)
2. [Competitive Landscape](#2-competitive-landscape)
3. [What We Have That No One Else Does](#3-what-we-have-that-no-one-else-does)
4. [What Competitors Have That We Lack](#4-what-competitors-have-that-we-lack)
5. [UX & Code Quality Gaps](#5-ux--code-quality-gaps)
6. [Feature Gap Priority Matrix](#6-feature-gap-priority-matrix)
7. [Implementation Plan](#7-implementation-plan)
8. [Immediate Recommendation](#8-immediate-recommendation)

---

## 1. Current State of the App

The core engine is solid. Here is an honest inventory of what is built and working:

### Shipped & Working
| Module | Status | Notes |
|---|---|---|
| AI content engine | ✅ Built | 10 campaign types, format-aware copy (reel/carousel/infographic/single image) |
| Multi-channel output | ✅ Built | Social + Email + SMS from a single brief |
| Content calendar | ✅ Built | 30-day planner, research-backed content mix ratios, custom sliders |
| Social publishing | ✅ Built (gated) | OAuth + publishers for IG/FB/LI/X done; blocked on Meta/LinkedIn app review |
| AI image generation | ✅ Built | Generate from scratch + photo enhancement + canvas editor |
| Brand management | ✅ Built | Org-level brand kit with field locks, brand-doc import via PDF |
| Multi-tenant teams | ✅ Built | Org → agents, roles, invite flow, RLS |
| Stripe billing | ✅ Verified | Checkout → webhook → DB verified end-to-end |
| Stop Slop quality gate | ✅ Built | Regex cliché detection + local-specificity check (no LLM call) |
| Campaigns hub | ✅ Built | Multi-channel asset grouping under one campaign |
| Post preview drawer | ✅ Built | Edit caption, reschedule, approve/publish inline |
| Speech-to-text dictation | ✅ Built | Web Speech API on the Create brief |
| Fair Housing compliance gating | ✅ Built | Blocks posts with flagged language; admin override available |

### Known Gaps (From Checklist)
| Module | Status |
|---|---|
| Analytics engine | ❌ Not built |
| Lead capture / CRM | ❌ Not built |
| Revenue attribution | ❌ Not built |
| Video engine | ❌ Not built |
| Stories / Reels publishing endpoints | ❌ Not built |
| White-label theming | ❌ Not built |
| Mobile navigation | ❌ Not built (desktop-only) |
| Meta / LinkedIn OAuth app review | ❌ Pending (external) |

### Plan Structure
| Plan | Price | Users | AI Campaigns/mo |
|---|---|---|---|
| Free | $0 | 1 | 3 |
| Starter | $49 | 1 | 20 |
| Professional | $99 | 1 | Unlimited |
| Team | $249 | 10 | Unlimited |
| Brokerage | $499 | Unlimited | Unlimited |

---

## 2. Competitive Landscape

### Competitor Overview

#### Lofty (formerly Chime) — $449–$1,500+/mo
The most feature-complete RE-specific platform. Originally a CRM, now has a purpose-built AI social media engine ("AI Marketer" launched Sept 2025).

**What they do well:**
- MLS-integrated auto-posting: listing status changes (Coming Soon → New → Sold) automatically create social posts with live MLS data — zero agent data entry
- Competitive analysis engine: compares an agent's social profile to top local agents, surfaces what's working in their market
- Embedded Google Ads + Facebook Ads manager
- Smart Plans: behavior-triggered automation sequences (email, SMS, social) based on lead actions

**Their weakness:** $449–$1,500/mo forces agents to buy an entire CRM ecosystem. Pricing out solo agents and small teams is their biggest vulnerability.

---

#### Roomvu — $90–$400/mo
350,000+ users. Video-first AI content with auto-publishing across 8 channels. The closest direct competitor.

**What they do well:**
- AI avatar / talking-head videos with voice cloning (Platinum+)
- Hyper-local market update videos auto-generated from MLS data
- Rolling 2-week auto-content calendar — fully automated, zero agent involvement
- 8 channels: IG, FB, LinkedIn, TikTok, YouTube Shorts, Google Business, X, Stories

**Their weakness:** **2.5/5 Capterra rating.** BBB complaints for unauthorized charges, AI-only customer support, misleading sales practices. Agents specifically report content feels "generic and formulaic." This is the exact problem the Stop Slop gate solves.

---

#### Coffee & Contracts — $74/mo
~25,000 agents. A monthly template library with pre-written captions — no AI, no scheduling.

**What they do well:**
- 200+ beautifully designed Canva templates, new drops every month
- Peer community of 25,000 agents
- Email newsletter templates (Flodesk-compatible)
- Structured monthly content calendar themes

**Their weakness:** No AI generation. No scheduling (agents must use a separate tool). Templates are identical for all 25,000 users — agents in the same market look the same. This entire business was built on something we can build as a single feature.

---

#### Dippidi — $497+/mo
Done-for-you hybrid: agency + SaaS platform.

**What they do well:**
- Fully managed execution — content is created and posted for agents
- AI Sales Assistant that nurtures leads via SMS, email, FB Messenger, Instagram DM, WhatsApp, Google Business Messenger
- "Dropz" monthly content bundles: SEO blogs + social posts + templates + email scripts

**Their weakness:** $497/mo positions them above most solo agents. Limited self-serve control. Platform quality is secondary to agency services.

---

#### Rela — ~$20/mo
Per-listing marketing automation: single property websites, flyers, Facebook lead ads.

**What they do well:**
- Single-property websites with 20+ templates, live in minutes
- Auto-resizes listing images across flyer, postcard, social formats simultaneously
- Listing video generator from photos
- Interactive floor plans + built-in lead capture

**Their weakness:** Very narrow scope — listing-only, no evergreen content, no social scheduling, no team collaboration.

---

#### Parkbench — $99–$499/mo
Hyperlocal community marketing. Agents "own" their neighborhood via a sponsored local page.

**What they do well:**
- Geographic exclusivity per zone (no competing agent on platform in same area)
- Relationship-based referral network cultivation via local business interviews
- Built-in email campaigns for database nurturing

**Their weakness:** Highly manual (agent must interview local businesses). Not a social media management tool. Single agent model, no team features. 7,000 users is a small base.

---

#### Luxury Presence — $500–$1,500+/mo
Premium website builder evolved into a full AI platform (launched May 2026). Raised **$37M in January 2026** for their AI relationship CRM — validating the attribution + CRM direction of this app's Phase 4.

**What they do well:**
- PresenceAI task orchestration: true AI agent behavior, pulls from all connected data streams
- AI CRM with relationship intelligence: identifies "hidden deals" in existing agent networks
- Human + AI hybrid: 500+ staff work inside the platform
- SEO + Generative Engine Optimization for AI search visibility

**Their weakness:** Priced for the top 1% of agents. Not accessible for solo agents or emerging teams. Social media management is still in beta.

---

#### General Schedulers (Buffer / Later / Hootsuite)
Used by agents who can't afford or don't need RE-specific tools.

| Tool | Price | RE-Specific Features |
|---|---|---|
| Buffer | Free – $18/mo | Unlimited AI assistant on free tier; no RE context |
| Later | $18/mo | Visual Instagram grid preview; no RE context |
| Hootsuite | $199/mo | Colliers RE case study; compliance integration; competitor benchmarking |

**Their weakness:** Zero real estate specificity. No MLS integration. No Fair Housing guardrails. No listing-specific automation. Agents use these as fallbacks, not primary tools.

---

#### Jasper / Copy.ai / Writesonic
General AI writing tools used manually by agents.

**What they do well:** Jasper's Brand Voice can learn an agent's style from their website. Jasper has 100+ purpose-built workflow agents.

**Their weakness:** No MLS integration, no social publishing, no real estate compliance guardrails, no listing automation. Requires prompt engineering skill most agents lack. Starting cost for brand voice features: $500+/mo (Jasper Business).

---

## 3. What We Have That No One Else Does

These are genuine competitive moats — not features that need to be built, but advantages that need to be marketed.

### Fair Housing Compliance Gating
**No RE-specific tool does this at scale.** NAR is actively warning agents about AI-generated Fair Housing violations. The app automatically blocks posts with flagged language before they can be published. This is a legal liability reducer that brokerages, franchise owners, and risk-conscious teams will pay specifically for. It should be a headline feature on the pricing page.

### Stop Slop Quality Gate
Roomvu's #1 user complaint is that AI content feels "generic and formulaic." This app's local-specificity checker (which runs in microseconds, no LLM call) flags posts that lack local market context and catches 16 real estate cliché patterns. This is the direct antidote to the problem every Roomvu competitor tries to exploit.

### Multi-Channel from a Single Brief
No competitor generates social copy + email + SMS in one action from a single content brief. Agents get a complete content package — not just a social post. At the same price point, this is 3x the output.

### Org-Level Brand Enforcement with Locks
Franchise and brokerage operators can lock brand colors, fonts, logos, and disclaimers so agent-generated content always stays on-brand. Hootsuite charges $399/mo for a basic approval workflow. We do brand enforcement + approval at $49/mo.

### Research-Backed Content Mix
The 30-day planner uses documented content mix ratios (Educational 27.5%, Community 22.5%, Social Proof 17.5%, Personal Brand 17.5%, Listings 12.5%) with adjustable sliders. No competitor makes this configurable or explains the research behind their defaults.

---

## 4. What Competitors Have That We Lack

Ranked by commercial impact:

| Gap | Who Has It | Why It Matters |
|---|---|---|
| **Geographic flexibility** | Every competitor | App is hardcoded to Monmouth County, NJ. Every other market is unreachable. |
| **Analytics dashboard** | Every paid competitor | Without metrics, agents can't prove ROI. The absence makes the app look unfinished. |
| **Brand voice personalization** | Jasper ($500+/mo) | Agents want AI that sounds like them, not a generic real estate robot. |
| **MLS / listing auto-fill** | Lofty, Roomvu, Rela | Manually typing listing data for every campaign is the biggest friction point. |
| **Listing trigger sequences** | Lofty, Roomvu | Status change (New → Sold) should auto-fire a 5-post content plan. |
| **Multi-format variants** | Buffer, Later, Roomvu | One post → IG square, Story (9:16), LinkedIn banner. Currently agents re-crop manually. |
| **Video / Reels generation** | Roomvu (core product) | Reels get 403% more inquiries. The marketing agent recommends this format. We can't produce it. |
| **Template library** | Coffee & Contracts | 200+ templates for $74/mo. Quick-start content reduces activation time for new users. |
| **Per-listing landing pages** | Luxury Presence, Rela | Lead capture from social → a trackable listing page. |
| **Set-and-forget automation** | Dippidi, Roomvu | Our automation still requires daily approval clicks, eliminating its value for busy agents. |
| **Mobile-responsive UI** | All competitors | RE agents are on their phones at open houses and showings. |
| **Print marketing** | Rela | Postcards and flyers are still widely used in RE. |

---

## 5. UX & Code Quality Gaps

Findings from the code audit. These are bugs and UX gaps in the existing codebase — independent of the competitive feature gaps.

### Missing User Feedback

**No toast / snackbar system.** The app shows inline error messages but has no temporary success/error feedback. Every major action is silent on completion. Locations that need toasts:
- `app/(app)/calendar/QueueItem.tsx` — after caption save, campaign attach
- `app/(app)/library/LibraryClient.tsx` — after image delete
- `app/(app)/brand/BrandClient.tsx` — after brand save
- `app/(app)/generate/GenerateClient.tsx` — after photo upload

**No loading progress for long operations.** AI generation routes have a 60-second max duration (`maxDuration = 60`). The "Your agents are working…" message has no progress indication. Users don't know if it's stuck.

**No confirmation dialogs.** The "Delete campaign" button in `app/(app)/campaigns/[id]/CampaignDetailClient.tsx:77` uses a browser `confirm()` dialog. Should use a styled modal.

### Silent Failures

**Video format mentioned but not delivered.** The marketing agent recommends Reels as the highest-performing format. The billing page (`lib/billing/plans.ts:58`) lists "Video generation" as a Professional plan feature. Neither produces actual video — only a script overlay on a static image. Users aren't told this.

**AI image enhancement silently falls back.** When `enhance` is toggled on and fails, the system silently reverts to the original photo (`app/api/campaigns/generate/route.ts:225`). Users don't know if enhancement ran.

**Library load has no timeout or error state.** In `app/(app)/generate/GenerateClient.tsx:212-229`, if the library fetch fails or times out, users see "Loading…" forever.

### Hardcoded Values That Should Be Configurable

| Value | Location | Impact |
|---|---|---|
| "Monmouth County" in AppShell | `components/AppShell.tsx:57` | Visible to all users |
| "Monmouth County, NJ" default | `app/api/calendar/plan/route.ts:199` | Every calendar plan uses NJ data |
| Platform posting times | `lib/agents/calendar.ts:77-81` | No way to customize posting schedule per org |
| LOCAL_EXPERTISE in prompts | `lib/agents/marketing.ts` | NJ-specific knowledge injected into every generation |

### Incomplete Error Handling

**`QueueItem.attachCampaign()` has no error recovery.** The function optimistically updates state, makes a silent fetch, then calls `router.refresh()` with zero error handling. If the PATCH fails, the UI state diverges from the server with no user notification. (`app/(app)/calendar/QueueItem.tsx:78-86`)

**`Promise.all` calls have no individual error handling.** In `app/(app)/calendar/QueueItem.tsx:58-75`, if either fetch in the `Promise.all` fails, both are lost and the error message is generic.

**No retry logic on generation timeout.** If generation hits a 504, users see "try again" but must manually re-click. No built-in retry.

### Missing Functionality Behind Existing UI

**Library has no labeling, search, or bulk upload.** The `label` field exists in the data model but is not exposed in the UI. The library modal has no search or filter. Only one-at-a-time upload via hidden file input.

**Twitter/X integration has no connection status UI.** The publisher is fully implemented (`lib/social/publishers/twitter.ts`) but there is no UI to verify the X account is connected or show its status.

**Recurring job automation has no content preview.** Users can enable the automation but cannot preview what posts will be generated before they drop into the approval queue.

---

## 6. Feature Gap Priority Matrix

Ranked by `(user impact × market value) / effort`:

### Tier 1 — Quick Wins (1–3 days each, very high leverage)

| # | Feature | Effort | Impact | Why Now |
|---|---|---|---|---|
| ~~1~~ | ~~Geographic settings~~ | ~~2 days~~ | ~~Critical~~ | ✅ **DONE** — `area`/`state` added to `orgs` table; threaded through all 6 agent prompt files, 4 API routes, AppShell sidebar, Company Brand settings |
| ~~2~~ | ~~Brand voice onboarding~~ | ~~2 days~~ | ~~Critical~~ | ✅ **DONE** — 5-field brand voice config in `orgs.brand_voice`; injected into marketing + messaging agent user content; form in Company Brand page |
| ~~3~~ | ~~Caption regeneration~~ | ~~1 day~~ | ~~High~~ | ✅ **DONE** — `POST /api/posts/[id]/regenerate-caption`; "↻ Regenerate caption" button in QueueItem drawer with success feedback |
| ~~4~~ | ~~UTM link auto-injection~~ | ~~0.5 days~~ | ~~High~~ | ✅ **DONE** — `lib/utm.ts` utility; wired into generate route and message route |
| ~~5~~ | ~~Auto-approve toggle~~ | ~~1 day~~ | ~~High~~ | ✅ **DONE** — `auto_approve` column on `recurring_jobs`; toggle in RecurringJobControls; cron route skips queue when enabled |
| ~~6~~ | ~~Mobile navigation~~ | ~~2 days~~ | ~~High~~ | ✅ **DONE** — Hamburger menu + slide-out drawer in AppShell; `NavItems` component shared across desktop/mobile |
| ~~7~~ | ~~Open House QR code~~ | ~~1 day~~ | ~~Medium~~ | ✅ **DONE** — QR section in GenerateClient on `open_house` type; server-side proxy at `/api/qr` avoids CORS; download button with error feedback |
| ~~8~~ | ~~Bulk export (ZIP + CSV)~~ | ~~2 days~~ | ~~Medium~~ | ✅ **DONE** — `GET /api/posts/export?from=&to=` CSV route; "Export week CSV" button on Calendar page |

### Tier 2 — Medium Effort, High Impact (1–2 weeks each)

| # | Feature | Effort | Impact | Why Now |
|---|---|---|---|---|
| ~~9~~ | ~~Analytics stub dashboard~~ | ~~3 days~~ | ~~Critical~~ | ✅ **DONE** — `/analytics` page with KPI row, monthly bar chart, platform/status breakdowns, content-type mix, publish rate; "Analytics" in nav |
| ~~10~~ | ~~Multi-format variants (Stories 9:16)~~ | ~~3 days~~ | ~~High~~ | ✅ **DONE** — Dynamic preview aspect ratio per sizeKey; quick-format chip row (Portrait / Square / Story 9:16 / FB+LinkedIn) in Generate flow |
| ~~11~~ | ~~Listing trigger sequences~~ | ~~2 days~~ | ~~High~~ | ✅ **DONE** — `POST /api/listings/sequence` creates 5 bulk-inserted drafts over 14 days; `ListingSequenceForm` inline on Calendar page |
| 12 | Content template library | 5 days | High | Coffee & Contracts built their whole business on this. Reduces activation time for new users. |
| 13 | Address autocomplete + pre-fill | 4 days | High | Cuts listing data entry by 80%. Most common friction point in the Create flow. |
| 14 | Brokerage content push | 1 week | High | Hootsuite charges $399/mo for basic approval workflow. Unlocks team/franchise sales. |

### Tier 3 — Major Features (Existing Roadmap, Right Sequencing)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 15 | Social analytics pull (Meta/LinkedIn Insights) | 9 days | Phase 2 roadmap. Turns stub dashboard into real data. |
| 16 | Lead capture / CRM | 3–4 weeks | Phase 3. Needs landing pages + forms + `leads` table. |
| 17 | Revenue attribution engine | 4–6 weeks | Phase 4 North Star. Needs analytics + leads data to join against first. |
| 18 | Video engine (Shotstack) | 6–8 weeks | Largest single lift. Depends on job queue infrastructure. |
| 19 | White-label theming | 2–3 weeks | Brokerage-tier feature. After analytics ships. |

---

## 7. Implementation Plan

### Sprint 1 — Unlock the Market (Weeks 1–2)

**Step 1: Geographic Settings** (Days 1–2)
- Add `area` and `state` fields to the `orgs` table (1-line migration)
- Add form fields to the Company settings page
- Replace the 5 hardcoded "Monmouth County, NJ" instances in agent prompts with `org.area, org.state`
- Add `DEFAULT_AREA` / `DEFAULT_STATE` env var fallbacks

**Step 2: Brand Voice Onboarding** (Days 3–4)
- 5-question intake in Company settings: agent style (formal/conversational/bold), target buyer profile, market specialty, what makes them different, sample post they like
- Store as `org.brand_voice` (JSON)
- Inject as a `voiceGuide` parameter into the marketing agent's system prompt
- Reduces generic AI output immediately, no model change needed

**Step 3: Caption Regeneration** (Day 5)
- Add "Regenerate caption" button to `QueueItem.tsx` post drawer
- New API route `POST /api/posts/[id]/regenerate-caption`
- Calls marketing agent with stored post metadata, PATCHes only the `caption` field
- Uses existing `FAST_MODEL` for speed and low cost

**Step 4: UTM Link Injection** (Day 5, afternoon)
- New utility: `lib/utils/utmLinks.ts` — 20 lines
- Call in `app/api/campaigns/generate/route.ts` before saving posts
- Call in `app/api/campaigns/message/route.ts` for email links
- Format: `?utm_source=<platform>&utm_medium=social&utm_campaign=<id>&utm_content=<post_id>`

**Step 5: Auto-Approve Toggle** (Days 6–7)
- Add `auto_approve: boolean` to `recurring_jobs` table
- Toggle switch in `RecurringJobControls.tsx`
- In `app/api/cron/recurring/route.ts`: if `auto_approve` is true and the Fair Housing gate passes → set post status directly to `scheduled`
- Fair Housing gate still runs on every post regardless

**Step 6: Mobile Navigation** (Days 8–10)
- Responsive hamburger menu in `components/AppShell.tsx`
- Tailwind `md:hidden` / `hidden md:flex` pattern
- Slide-out drawer using a `<dialog>` element or simple state toggle
- No new dependencies needed

---

### Sprint 2 — Credibility & Retention (Weeks 3–4)

~~**Step 7: Analytics Stub Dashboard** (Days 11–13)~~ ✅ **DONE**
- `app/(app)/analytics/page.tsx` — CSS-only charts, no new dependencies
- Queries `posts` (state/platform/monthly), `campaigns` (type mix), `marketing_campaigns` (count)
- KPI row + monthly bar + platform/status bars + content type mix + publish rate card
- "Analytics" added to AppShell NAV

~~**Step 8: Multi-Format Variants** (Days 14–16)~~ ✅ **DONE**
- `SIZE_ASPECT` map + `QUICK_FORMATS` chips in `GenerateClient.tsx`
- Preview placeholder changes aspect ratio dynamically (square / portrait / 9:16 story / landscape)
- `ig_story` (1080×1920) was already in `lib/design/platforms.ts`

~~**Step 9: Listing Trigger Sequences** (Days 17–18)~~ ✅ **DONE**
- `POST /api/listings/sequence` — bulk-inserts 5 drafts over Days 0/3/7/10/14
- `ListingSequenceForm` inline on the Calendar page approval queue header
- Posts use pre-written templates per type; user can regenerate captions from the queue

~~**Step 10: Bulk Export** (Days 19–20)~~ ✅ **DONE**
- `GET /api/posts/export?from=&to=` returns RFC-4180 CSV; no `jszip` needed (captions exported as text)
- `ExportButton` on Calendar page exports the current 7-day window; error feedback included

~~**Step 11: Open House QR Code** (Day 21)~~ ✅ **DONE**
- QR section renders in right panel when `type === "open_house"` in `GenerateClient.tsx`
- `/api/qr` server-side proxy route avoids browser CORS restrictions on QR API
- `downloadQr()` fetches through proxy, creates blob URL, triggers download with error feedback

---

### Sprint 3 — Competitive Parity (Weeks 5–8)

**Step 12: Social Analytics Pull** (Days 22–30)
- New table: `social_metrics(post_id, platform, metric, value, captured_at)`
- New cron: `GET /api/cron/pull-metrics` — calls Meta Graph API + LinkedIn Organization Analytics API per published post
- Display per-post: impressions, reach, likes, comments, shares in the post preview drawer
- Aggregate to `/analytics` dashboard

**Step 13: Content Template Library** (Days 25–30)
- 25 JSON template configs for common RE content types
- Examples: "Just Sold in a Seller's Market", "Monthly Market Snapshot", "First-Time Buyer Tips", "Spring Selling Season", "Open House This Weekend"
- Template picker step in `GenerateClient.tsx` before the brief form
- Templates pre-fill the brief; AI still personalizes with agent's brand voice and market

**Step 14: Address Autocomplete + Property Pre-Fill** (Days 28–32)
- Google Places Autocomplete on the address field in the brief form
- On address selection, call a property data API (RentCast, ATTOM, or Zillow informal) to pre-fill beds, baths, sqft, estimated value
- Fallback gracefully to manual entry if no data found

**Step 15: Brokerage Content Push** (Days 30–38)
- Admin creates a post → marks it as "push to agents"
- Agents see the pushed post in their approval queue with a badge "From your brokerage"
- One-click approve → schedules to their connected social accounts
- Admin sees a dashboard of how many agents approved/published each pushed post

---

## 8. Immediate Recommendation

Start with these three this week. Combined effort: ~4.5 days. Combined impact: transforms the commercial positioning of the product.

### 1. Geographic Settings (2 days)
This is not a feature — it's a market unlock. The entire US agent population is unreachable today. Every agent outside New Jersey who tries the product gets NJ-specific content. This is a single migration + 5 find-and-replace operations in the agent prompts.

### 2. Brand Voice Onboarding (2 days)
Jasper charges $500/mo for this. Roomvu's top complaint is generic content. A 5-question intake that stores agent personality and injects it into every future generation is permanently differentiating — and it makes the app feel smarter the longer an agent uses it.

### 3. UTM Link Injection (half a day)
Lays the foundation for the Phase 4 attribution engine at essentially zero cost. Once UTMs are in every post, every click that ever comes from a published post becomes traceable. This pays off exponentially when the attribution engine ships.

---

*Analysis produced by multi-agent review: codebase audit agent, UX/code quality agent, and competitive landscape research agent running in parallel.*
