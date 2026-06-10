# Run Book — Operating Marquee

Practical procedures for running the app day-to-day and responding when something
breaks. For architecture, the env-var table, and first-time deploy, see
[`OPERATIONS.md`](OPERATIONS.md). For platform credentials see
[`SOCIAL_SETUP.md`](SOCIAL_SETUP.md). Outstanding setup is in
[`CHECKLIST.md`](CHECKLIST.md).

## How to use this

Find the situation in the table, follow the steps. Each playbook lists how to
**confirm**, **fix**, and **verify**. Don't skip verify.

| If… | Go to |
| --- | --- |
| You need to ship / undo a change | [Deploy & rollback](#deploy--rollback) |
| The schema needs to change | [Database migrations](#database-migrations) |
| A secret/key changed or leaked | [Rotate a secret](#rotate-a-secret) |
| Scheduled posts/news aren't running | [Cron](#cron-jobs) |
| AI generation is failing | [Generation failures](#playbook-generation-failures) |
| Posts won't publish | [Publishing failures](#playbook-publishing-failures) |
| Checkout/subscription is wrong | [Billing](#playbook-billing) |
| MLS import is broken | [MLS import](#playbook-mls-import) |
| Feedback isn't reaching Notion | [Feedback → Notion](#playbook-feedback--notion) |
| A user can't see/their data | [Auth & RLS](#playbook-auth--rls) |

---

## Quick reference

- **Hosting:** Vercel (Next.js, Fluid Compute). Deploys on push to the production branch.
- **Data:** Supabase project `llobtozbbplxkiiqzzfb` (Postgres + RLS, Auth, Storage `media`).
- **AI:** Anthropic (agents); OpenAI `gpt-image-1` (optional images).
- **Dashboards:** Vercel (deploys, runtime logs), Supabase (SQL, logs, advisors),
  Stripe (billing), Anthropic console (spend/limits), Notion (feedback triage).
- **Health check:** sign in → Create → generate a Just Sold post end-to-end.

---

## Routine procedures

### Deploy & rollback
- **Deploy:** merge/push to the production branch; Vercel builds + promotes.
  Watch the deployment; confirm the health check above.
- **Rollback:** Vercel → Project → **Deployments** → pick the last green
  deployment → **Promote to Production**. (Instant; no rebuild.) Roolback does
  **not** revert DB migrations — see below.

### Database migrations
Migrations live in `supabase/migrations/NNNN_*.sql` (sequential). Apply to the
remote project, then commit the file so the repo and DB stay in lockstep.

1. Write `supabase/migrations/NNNN_name.sql`. Use `if not exists` / `add column
   if not exists` so it's safe to re-run.
2. Apply it to the project (Supabase MCP `apply_migration`, or the SQL editor).
3. Run the **Supabase advisors** (security + performance) — a new table with RLS
   enabled but **no policy** will show up here; add a policy before shipping.
4. Update `lib/supabase/types.ts` to match, then `npm run typecheck`.
5. Commit the migration + types together.

> Migrations are forward-only here. To "roll back," write a new migration that
> reverses the change. Never edit an already-applied migration file.

### Rotate a secret
1. Generate the new value (provider dashboard, or `openssl rand -base64 32` for
   `SOCIAL_TOKEN_ENC_KEY` / `CRON_SECRET`).
2. Vercel → Project → **Settings → Environment Variables** → update (Production
   **and** Preview) → **Redeploy** (env changes need a new deploy).
3. Verify the dependent flow (e.g. rotate `ANTHROPIC_API_KEY` → run a generate).

> ⚠️ Rotating `SOCIAL_TOKEN_ENC_KEY` makes **already-stored** social tokens
> undecryptable — agents must reconnect their accounts. Only rotate it if it
> leaked, and tell users to reconnect.

### Cron jobs
Defined in `vercel.json` → `/api/cron/*`, authed by `CRON_SECRET`.
- **Confirm:** Vercel → **Cron Jobs** shows last run + status; runtime logs show
  the invocation.
- **Run manually:** `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/<job>`.
- **Note:** Vercel Hobby caps cron at daily; `publish-queue` runs daily there. On
  Pro, tighten its schedule for near-real-time publishing.

### Feature enablement (per-customer / per-deploy)
- **MLS import:** set `RENTCAST_API_KEY`, redeploy. Agents then get "Import from MLS".
- **Feedback → Notion:** set `NOTION_API_KEY` + `NOTION_FEEDBACK_DB_ID`, share the
  Notion DB with the integration, redeploy.
- **White-label (a brokerage):** have their admin enable it in Company → Brand,
  upload a dark-bg (and light-bg) logo. No deploy needed.
- **Social posting:** see `SOCIAL_SETUP.md` (per-platform OAuth + review).

---

## Incident playbooks

Severity guide: **SEV1** product down / data risk (page now) · **SEV2** a core
flow broken for many · **SEV3** degraded/one feature · **SEV4** cosmetic.

### Playbook: Generation failures
*Symptom:* Create shows an error / "generation failed".
- **Confirm:** Vercel runtime logs for `/api/campaigns/generate` (or `/message`).
  Look for the upstream cause — the route wraps AI errors into a readable JSON
  message (`friendlyAiError`).
- **Fix:** Most common is Anthropic **billing/rate limit/invalid key** → check the
  Anthropic console; top up or raise limits; confirm `ANTHROPIC_API_KEY`. If image
  generation specifically fails, set `IMAGE_PROVIDER=stub` to keep copy working
  while you fix `OPENAI_API_KEY`.
- **Verify:** generate a Just Sold post end-to-end.

### Playbook: Publishing failures
*Symptom:* scheduled posts stay queued or land in `failed`.
- **Confirm:** Vercel **Cron** (did `publish-queue` run?) + logs; the post's
  `state` and any stored platform error.
- **Fix:** if the platform OAuth isn't approved yet, this is expected — posts fall
  back to **manual export** (download image + copy caption); the queue is
  identical. If a token expired, have the agent reconnect under Profile →
  Connections; `refresh-tokens` cron handles routine refresh.
- **Verify:** re-run the queue manually (see Cron) and watch one post publish.

### Playbook: Billing
*Symptom:* checkout fails, or a paid org shows the wrong plan.
- **Confirm:** Stripe → Events/Logs for the customer; the org's `subscriptions`
  row + `billing_events` (audit). Confirm the **webhook** endpoint is receiving
  `checkout.session.completed` / `customer.subscription.*` / `invoice.*`.
- **Fix:** if webhooks aren't arriving, re-check `STRIPE_WEBHOOK_SECRET` and the
  endpoint URL; resend the event from Stripe. If routes 503, `STRIPE_SECRET_KEY`
  is unset (billing intentionally disabled).
- **Verify:** test checkout with `4242 4242 4242 4242` (test mode) and confirm the
  plan flips in the DB.

### Playbook: MLS import
*Symptom:* "Import from MLS" errors or returns nothing.
- **Confirm:** logs for `/api/listings/search`. 503 = `RENTCAST_API_KEY` missing;
  502 = RentCast upstream error; empty = no listings for that query/state.
- **Fix:** set/repair `RENTCAST_API_KEY`; remember a bare city search defaults to
  the agent's **market-area state** (Company → Brand), so a wrong state there
  yields wrong/empty results.
- **Verify:** search a known address; Save it; confirm it appears in My listings.

### Playbook: Feedback → Notion
*Symptom:* submissions don't show in Notion.
- **Confirm:** the submission **is** captured (it always saves to the `feedback`
  table even if Notion fails). Check `feedback.notion_page_id` — null means the
  mirror didn't run.
- **Fix:** ensure `NOTION_API_KEY` + `NOTION_FEEDBACK_DB_ID` are set and the DB is
  **shared with the integration**; the DB needs a title property. The mirror is
  best-effort and never blocks capture, so no data is lost meanwhile.
- **Verify:** submit a test feedback; a new Notion page appears; the row gets a
  `notion_page_id`.

### Playbook: Auth & RLS
*Symptom:* a user can't sign in, or can't see their data / sees an error.
- **Confirm:** Supabase Auth logs (sign-in) + the run **advisors** (RLS issues).
  Most "missing data" is a Row-Level-Security policy, not lost data.
- **Fix:** verify `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY`;
  for a brand-new table check it has an org-scoped policy (`is_org_member`).
  Leaked-password protection + provider settings are in Supabase Auth.
- **Verify:** sign in as the affected user; confirm the data loads.

---

## On-call checklist (start of shift)
- [ ] Latest production deploy is green (Vercel).
- [ ] Run the health check (generate one post).
- [ ] Supabase advisors: no new **security** lint (esp. RLS-without-policy).
- [ ] Cron last-runs are recent and succeeded.
- [ ] Anthropic spend is within the monthly cap.
