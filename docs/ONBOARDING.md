# Onboarding Guide — Marquee

This guide walks a **real-estate company** (brokerage) and its **agents** through
getting set up and producing their first on-brand posts. It also doubles as the
product narrative for selling Marquee to brokerages.

---

## The model in one sentence

> A brokerage uploads its brand once; every agent it invites inherits that brand
> automatically and just adds their own listings and photos.

Everyone belongs to an **org**. A brokerage is an org with many agents; a solo
agent is an "org of one." Roles:

| Role | Can do |
| --- | --- |
| **Owner / Admin** | Set the company brand, import a brand guide, lock brand fields, invite/manage agents, connect social accounts |
| **Member** (agent) | Inherit the company brand, add personal details (headshot, contact, license), upload listings + photos, generate & schedule posts |

---

## Part 1 — Company / brokerage setup (Admin)

### 1. Create the company account
Sign up at `/signup`. The first user becomes the **Owner** and an org is created
automatically.

### 2. Set the brand — two ways

**Fast path: import a brand guide.** On **Brand kit** (`/brand`), use **Import a
brand guide** and upload your brand document (PDF, `.md`, or `.txt`). Claude reads
it and extracts your **colors, fonts, disclaimer, and voice**. Review the
preview, click **Apply to brand kit**, then **Save**. (Nothing goes live until
you save — you always confirm first.)

**Manual path:** set primary / secondary / accent colors, upload your **logo**
(light-bg and dark-bg variants), add your brokerage **disclaimer line**, and
upload to the shared **Library** (`/library`) any reusable imagery agents should
have.

### 3. Lock what must stay consistent
On **Team** (`/team`), choose which brand fields are **locked** (e.g. logo,
colors, fonts, disclaimer). Locked fields are inherited by every agent and can't
be overridden — so the whole brokerage stays on-brand. Unlocked fields are
suggestions agents may personalize.

### 4. Invite your agents
On **Team**, enter an agent's email + role. *Note:* the invitee must have signed
up first (there is no email-token invite yet); once they have an account, adding
them by email attaches them to your org. Owners can't be demoted/removed from the
UI, and you can't change your own role.

### 5. (Optional) Connect social accounts
On **Settings → Connections** (`/settings/connections`), connect Instagram /
Facebook / LinkedIn. Until those platforms approve the app for live posting,
finished posts use **manual export** (download the image + copy the caption) —
the queue and workflow are identical, so nothing changes when live posting turns
on.

---

## Part 2 — Agent setup (Member)

1. **Sign up** at `/signup`, then ask your admin to add you to the company org.
2. On **Brand kit**, fill your **personal** details — headshot, name, license #,
   phone. Company colors/logo/disclaimer are inherited (and show as locked if the
   admin locked them).
3. You're ready to create.

---

## Part 3 — Create a post (everyone)

1. Go to **Create** (`/generate`).
2. Pick a **campaign type**:
   - *Just Sold, New Listing, Open House* — listing announcements
   - *Market Stat, Neighborhood, Deal of the Week, Before/After, Educational,
     Testimonial* — high-engagement content from the NJ market research
3. Enter listing details (address, town, price, beds/baths/sqft) — these persist
   as a **listing** record and tie your photos to that property.
4. **Upload photos** (or pull from the company **Library**).
5. Optionally toggle **✨ AI-enhance the hero photo** (sky/lawn/exposure cleanup).
6. Click **Generate campaign**. You get:
   - a **branded graphic** in your company colors/logo,
   - a **caption + CTA + local hashtags**,
   - the recommended **format** (e.g. a Reel script or carousel slide breakdown),
   - any **Fair-Housing compliance notes**.
7. **Download** the graphic, or send it to the calendar to schedule/publish.

---

## Part 4 — Plan a month (Strategy)

On **Calendar** (`/calendar`), click **Plan 30 days**. The strategist allocates
~20 posts balanced to proven content-mix ratios:

| Bucket | Target share |
| --- | --- |
| Educational (market stats, tips) | ~28% |
| Community (neighborhood, before/after) | ~23% |
| Social proof (just sold, testimonials) | ~18% |
| Personal brand | ~18% |
| Listings | ~12% (capped — never more) |

Each slot is scheduled at the platform's best day/time (IG Mon/Wed/Fri 10a, FB
Fri/Sat, LinkedIn Tue/Thu 9a) with a concrete local angle, and lands as a
**draft in the approval queue**. You review, generate the full post, and approve.

You can also enable **recurring** local-market and trend-watch jobs from the
same page — they draft posts for review on a cadence (nothing auto-publishes
unless you opt in).

---

## Part 5 — Approve & publish

In the **approval queue** (`/calendar`):
- **Approve** a draft to stage it, **Publish** to send it.
- If a post has **Fair-Housing notes**, publishing is **blocked** and the notes
  are shown; an admin can review and choose **"I've reviewed — publish anyway."**
- Live publishing posts via the connected account; until platform approval, you
  get a manual-export bundle (image + caption) through the same button.

---

## Guardrails worth knowing

- **Fair Housing** — the copywriter avoids steering language; the publish gate is
  a hard stop on flagged posts.
- **AI imagery** — enhancement is clearly an enhancement; label virtual changes
  to property photos per MLS/NAR rules.
- **No invented stats** — the marketing agent won't fabricate numbers. "Market
  Stat" posts stay qualitative unless you provide real figures.

---

## Quick reference

| I want to… | Go to |
| --- | --- |
| Set/import the company brand | `/brand` (admin) |
| Lock brand fields / invite agents | `/team` (admin) |
| Connect Instagram/FB/LinkedIn | `/settings/connections` (admin) |
| Add reusable company imagery | `/library` |
| Make a single post | `/generate` |
| Plan a month / review drafts | `/calendar` |
| See recent campaigns & trends | `/dashboard` |
