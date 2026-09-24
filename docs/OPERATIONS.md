# Operations

Monitoring, day-to-day procedures, and incident response for the running app. For architecture, see `ARCHITECTURE.md`. For hosting/env/cron configuration, see `docs/DEPLOYMENT.md`. For per-service setup, see `docs/INTEGRATIONS.md`.

## Quick reference

- **Hosting:** Vercel (Next.js, Fluid Compute). Deploys on push to the production branch.
- **Data:** Supabase project `llobtozbbplxkiiqzzfb` (Postgres + RLS, Auth, Storage `media`). UNVERIFIED: this project ref was carried over from the prior version of this document; not independently re-confirmed in this pass.
- **AI:** Anthropic (agents); OpenAI `gpt-image-1` (optional images).
- **Dashboards:** Vercel (deploys, runtime logs), Supabase (SQL, logs, advisors), Stripe (billing), Anthropic console (spend/limits), Notion (feedback triage).
- **Health check:** sign in → Create → generate a Just Sold post end to end.
Source: prior `docs/RUNBOOK.md`, carried forward; not independently re-verified against live infrastructure in this pass.

## Routine procedures

### Deploy and rollback
- **Deploy:** merge/push to the production branch; Vercel builds and promotes automatically. Watch the deployment; confirm the health check above.
- **Rollback:** Vercel → Project → Deployments → pick the last green deployment → Promote to Production. This is instant and does not rebuild. It does **not** revert database migrations — see below.

### Database migrations
Migrations live in `supabase/migrations/NNNN_*.sql`, sequential and forward-only. To "roll back," write a new migration that reverses the change; never edit an already-applied migration file.

1. Write `supabase/migrations/NNNN_name.sql`, using `if not exists`/`add column if not exists` so it's safe to re-run.
2. Apply it to the project (Supabase SQL editor, CLI, or MCP `apply_migration`).
3. Run the Supabase security and performance advisors — a new table with RLS enabled but no policy shows up here; add a policy before shipping. This repo's own history includes several migrations that fixed RLS gaps after the fact (`0003`, `0008`, `0013`, `0015` — see `docs/decisions/0001-supabase-as-data-auth-storage-platform.md`), so treat this step as load-bearing, not optional.
4. Update `lib/supabase/types.ts` to match, then run `npx tsc --noEmit`.
5. Commit the migration and the updated types together.

### Rotate a secret
1. Generate the new value (provider dashboard, or `openssl rand -base64 32` for `SOCIAL_TOKEN_ENC_KEY`/`CRON_SECRET`).
2. Vercel → Project → Settings → Environment Variables → update (Production **and** Preview) → Redeploy (env changes need a new deploy to take effect).
3. Verify the dependent flow (for example, rotating `ANTHROPIC_API_KEY` → run a generation).

**Rotating `SOCIAL_TOKEN_ENC_KEY` makes already-stored social OAuth tokens permanently undecryptable** — every connected agent must reconnect their account. Only rotate this key if it has actually leaked, and tell users to reconnect before rotating.

### Cron jobs
Defined in `vercel.json`, authenticated by `CRON_SECRET` (see `docs/DEPLOYMENT.md` for the full schedule table).
- **Confirm:** Vercel → Cron Jobs shows last run and status; runtime logs show the invocation.
- **Run manually:** `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/<job>`
- **Note:** the standard's own gitignore/env conventions aside, remember `CRON_SECRET` is a genuine secret — never paste it into a shared terminal history or a non-secret log line when running the manual curl above.

### Feature enablement (per-customer or per-deploy)
- **MLS import:** set `RENTCAST_API_KEY`, redeploy. Agents then get "Import from MLS."
- **Feedback → Notion:** set `NOTION_API_KEY` + `NOTION_FEEDBACK_DB_ID`, share the Notion database with the integration, redeploy.
- **White-label (a brokerage):** the brokerage's admin enables it in Company → Brand and uploads a dark-background (and light-background) logo. No deploy needed.
- **Social posting:** see `docs/INTEGRATIONS.md` for per-platform OAuth setup and app-review requirements.

## Incident playbooks

Severity guide: **SEV1** product down / data risk (page now) · **SEV2** a core flow broken for many users · **SEV3** degraded / one feature · **SEV4** cosmetic.

### Generation failures
*Symptom:* Create shows an error / "generation failed."
- **Confirm:** Vercel runtime logs for `/api/campaigns/generate` (or `/message`). The route wraps AI errors into a readable JSON message; look for the upstream cause in that message.
- **Fix:** the most common cause is an Anthropic billing/rate-limit/invalid-key problem — check the Anthropic console, top up or raise limits, confirm `ANTHROPIC_API_KEY`. If only image generation fails, set `IMAGE_PROVIDER=stub` to keep copy generation working while `OPENAI_API_KEY` is fixed.
- **Verify:** generate a Just Sold post end to end.

### Publishing failures
*Symptom:* scheduled posts stay queued or land in `failed`.
- **Confirm:** did `publish-queue` run (Vercel Cron dashboard + logs)? Check the post's `state` and any stored platform error.
- **Fix:** if the platform's OAuth isn't approved yet, this is expected — posts fall back to manual export (download image + copy caption); the queue UI is identical either way. If a token expired, have the agent reconnect under Profile → Connections; the `refresh-tokens` cron handles routine refresh before expiry.
- **Verify:** re-run the queue manually (see Cron jobs above) and watch one post publish.

### Billing
*Symptom:* checkout fails, or a paid org shows the wrong plan.
- **Confirm:** Stripe → Events/Logs for the customer; the org's `subscriptions` row plus `billing_events` (audit log). Confirm the webhook endpoint is receiving `checkout.session.completed` / `customer.subscription.*` / `invoice.*`.
- **Fix:** if webhooks aren't arriving, re-check `STRIPE_WEBHOOK_SECRET` and the endpoint URL; resend the event from the Stripe dashboard. If billing routes return 503, `STRIPE_SECRET_KEY` is unset (billing is intentionally disabled in that state, not broken).
- **Verify:** test checkout with Stripe's test card `4242 4242 4242 4242` (test mode) and confirm the plan flips in the database.

### MLS import
*Symptom:* "Import from MLS" errors or returns nothing.
- **Confirm:** logs for `/api/listings/search`. A 503 means `RENTCAST_API_KEY` is missing; a 502 means a RentCast upstream error; an empty result means no listings matched that query/state.
- **Fix:** set or repair `RENTCAST_API_KEY`. A bare city search defaults to the agent's market-area state (Company → Brand) — a wrong state there yields wrong or empty results.
- **Verify:** search a known address, save it, confirm it appears in My Listings.

### Feedback not reaching Notion
*Symptom:* submissions don't show up in Notion.
- **Confirm:** the submission is still captured — it always saves to the `feedback` table even if the Notion mirror fails. Check `feedback.notion_page_id`; null means the mirror didn't run.
- **Fix:** ensure `NOTION_API_KEY` and `NOTION_FEEDBACK_DB_ID` are set and the target database is shared with the integration, and that the database has a title property. The mirror is best-effort and never blocks capture, so no feedback data is ever lost while this is broken.
- **Verify:** submit a test feedback item; a new Notion page appears and the row gets a `notion_page_id`.

### Auth and RLS
*Symptom:* a user can't sign in, or can't see their data, or sees an unexpected error.
- **Confirm:** Supabase Auth logs (sign-in attempts) and the Supabase security/performance advisors. Most "missing data" reports are a Row Level Security policy gap, not actually lost data.
- **Fix:** verify `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are correct. For a brand-new table, check it has an org-scoped policy calling `is_org_member`. Leaked-password protection and provider settings live in Supabase Auth's own dashboard.
- **Verify:** sign in as the affected user and confirm their data loads.

## Backup and restore

UNKNOWN — no backup/restore procedure is documented in this repository. Point-in-time recovery and backup retention are presumed to be whatever the Supabase project's plan tier provides by default, but that is a platform setting, not something this repo configures, and was not confirmed in this pass. This is a real gap: if you need a specific recovery point objective, verify what the current Supabase plan actually provides rather than assuming.

## Monitoring and debugging

- **Deployments and build logs:** Vercel dashboard, or the Vercel MCP tools (`list_deployments`, `get_deployment_build_logs`/equivalent, runtime logs).
- **Agent cost:** each generation/plan call writes `cost_usd` and token counts to the `agent_runs` table for per-org spend tracking.
- **Supabase advisors:** run the security and performance advisors after any schema (DDL) change.

## Who to contact

UNKNOWN — no on-call rotation, escalation contact, or external status page is documented in this repository. Single-owner project per `git log`; route incidents to the repository owner directly until this changes.

## On-call checklist (start of shift)

- [ ] Latest production deploy is green (Vercel).
- [ ] Run the health check (generate one post end to end).
- [ ] Supabase advisors show no new security lint (especially RLS-without-policy).
- [ ] Cron jobs' last runs are recent and succeeded.
- [ ] Anthropic spend is within the monthly cap.
