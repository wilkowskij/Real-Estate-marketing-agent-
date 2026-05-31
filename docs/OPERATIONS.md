# Operations — Deploy & Environment

How Marquee is hosted, configured, and kept running.

## Architecture

- **App**: Next.js 14 (App Router) on **Vercel** (serverless / Fluid Compute).
- **Data**: Supabase Postgres (RLS), Auth, and Storage (private `media` bucket).
- **AI**: Claude API (agents) + optional OpenAI `gpt-image-1` (photo enhancement).
- **Automation**: Vercel Cron → `/api/cron/*` routes.

## Deploy (Vercel Git integration)

The repo is connected to Vercel's GitHub integration. Every push to the
**production branch** auto-deploys; PR branches get preview URLs.

`vercel.json` pins the important bits so detection is deterministic:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "crons": [
    { "path": "/api/cron/recurring",      "schedule": "0 13 * * 1" },
    { "path": "/api/cron/publish-queue",  "schedule": "0 9 * * *" },
    { "path": "/api/cron/refresh-tokens", "schedule": "0 6 * * *" }
  ]
}
```

> **Hobby-plan note:** all crons are daily/weekly because Vercel Hobby only
> allows daily cron frequency. On Pro you can tighten `publish-queue` to e.g.
> `*/15 * * * *` for near-real-time scheduled publishing.

### First-time project setup
1. Vercel → **Add New → Project** → import the GitHub repo.
2. Framework auto-detects **Next.js** (also pinned in `vercel.json`).
3. Set the **Production Branch** to the branch that holds the app code.
4. Add the env vars below (Production + Preview).
5. Deploy. Copy the URL into `NEXT_PUBLIC_APP_URL` and redeploy so OAuth
   redirects resolve.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. The
running app reads its env from **Vercel**, not from GitHub Actions secrets
(those feed CI only).

### Required to boot + core flow
| Var | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Cron + OAuth callback writes; bypasses RLS. Never `NEXT_PUBLIC_`. |
| `ANTHROPIC_API_KEY` | Powers the marketing/design/orchestrator agents |
| `ANTHROPIC_MODEL` / `ANTHROPIC_FAST_MODEL` | Optional overrides (defaults are sensible) |

### Required for automation + social
| Var | Notes |
| --- | --- |
| `CRON_SECRET` | Long random string; the cron routes require it as a Bearer token |
| `SOCIAL_TOKEN_ENC_KEY` | 32-byte **base64** — encrypts social OAuth tokens at rest. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL; used to build OAuth redirect URIs |

### Optional features
| Var | Enables |
| --- | --- |
| `IMAGE_PROVIDER=openai` + `OPENAI_API_KEY` (+ `OPENAI_IMAGE_MODEL`) | AI photo enhancement (`gpt-image-1`) |
| `META_APP_ID` / `META_APP_SECRET` | Live Instagram + Facebook posting (after Meta App Review) |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | Live LinkedIn posting (after Marketing API access) |

> **Cron job execution:** Vercel automatically sends the cron requests with the
> `CRON_SECRET` you set, so the jobs authenticate without extra config.

## Database

Migrations live in `supabase/migrations/` and are applied in order:

| File | Adds |
| --- | --- |
| `0001_init.sql` | Core schema + RLS + new-user bootstrap trigger |
| `0002_storage.sql` | Private `media` bucket + org-scoped storage policies |
| `0003_lock_down_helper_functions.sql` | Revokes public EXECUTE on internal SECURITY DEFINER helpers |
| `0005_extend_campaign_types.sql` | Adds the high-traffic content types |

Apply via the Supabase SQL editor or the Supabase CLI. After schema changes,
regenerate types into `lib/supabase/database.types.ts` and re-run the security
advisor (it should report zero lints).

## CI

`.github/workflows/ci.yml` runs typecheck + tests + build on every push. It does
**not** deploy — Vercel's Git integration handles deploys.

## Monitoring & debugging

- **Deployments / build logs**: Vercel dashboard, or the Vercel MCP
  (`list_deployments`, `get_deployment_build_logs`, `get_runtime_logs`).
- **Agent cost**: each generation/plan writes `cost_usd` + token counts to the
  `agent_runs` table for per-org spend tracking.
- **Supabase advisors**: run the security/performance advisors after DDL changes.

## Going to production checklist

- [ ] Production branch set in Vercel; build green (`framework: nextjs`)
- [ ] All required env vars set (Production scope)
- [ ] `NEXT_PUBLIC_APP_URL` set to the live URL, redeployed
- [ ] Migrations applied; Supabase security advisor clean
- [ ] Signup → brand kit → generate smoke-tested
- [ ] (When ready) Meta/LinkedIn app review submitted for live posting
