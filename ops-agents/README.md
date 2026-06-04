# ops-agents

An internal **multi-agent Slack ops bot** — four Claude agents (Support, PM, Dev,
Marketing), each living in its own channel with its own persona and tools.

> **This is a standalone service. It is intentionally NOT part of the product
> app.** It ships inside the product repo only so it survives the ephemeral build
> container — **lift this `ops-agents/` folder into its own repo** before you run
> it for real. Nothing in the product imports it, and the product's typecheck
> excludes it.

## Why this design

- **Socket Mode**, not HTTP webhooks — an always-on worker needs no public URL,
  no signing-secret dance, and no serverless timeout (the product app couldn't do
  this; a standalone box can).
- **Claude Agent SDK** (`query()`), not a hand-rolled loop — you get the
  autonomous tool loop, an `allowedTools` allowlist, and a `canUseTool` approval
  hook for free.
- **Sandboxed agents** — each agent can ONLY call the tools you give it. The
  approval hook denies everything else, so there is no filesystem / shell / web
  access.
- **Graceful degradation** — every integration is opt-in via env. With zero
  integration keys the bot still runs; agents just reason and reply until you
  wire a tool.

## Architecture

```
Slack  ──(Socket Mode / WebSocket)──▶  ops-agents (this service)
                                          │  route by channel → Profile
                                          ▼
                              Claude Agent SDK  query()
                                  model + system prompt
                                  allowedTools + canUseTool
                                          │
                                          ▼
                              in-process MCP tools (src/tools/*)
   #support   → notion_search, linear_*          (Sonnet)
   #pm        → linear_*                          (Opus)
   #dev       → github_*, sentry_list_issues      (Opus)
   #marketing → product_generate_campaign         (Opus)
```

Sensitive tools (`*_create_*`, `product_generate_*`) are **gated**: the agent
pauses and posts Approve/Reject buttons; the tool runs only on a human Approve.

## Setup

1. **Create the Slack app** from [`slack-manifest.yml`](./slack-manifest.yml) at
   api.slack.com/apps. Install it, then grab:
   - Bot token `xoxb-…` → `SLACK_BOT_TOKEN`
   - App-level token `xapp-…` (scope `connections:write`) → `SLACK_APP_TOKEN`
2. **Invite the bot** to each channel: `/invite @ops-agents`.
3. **Configure env:** `cp .env.example .env` and fill in:
   - `ANTHROPIC_API_KEY`
   - the four `SLACK_*_CHANNEL` IDs (channel → View details → ID at the bottom)
   - any integration keys you have (all optional)
4. **Run:**
   ```bash
   npm install
   npm run dev        # or: npm start
   ```
   You'll see a startup table of which lanes are live and what tools each has.
5. **Use it:** in a mapped channel, `@ops-agents <your request>`. Replies thread.

## Deploy (always-on)

Any always-on host works (this is a worker, not a web app):

```bash
# Railway / Render / Fly / a small VM
docker build -t ops-agents .
docker run --env-file .env ops-agents
```

Set the same env vars in your host's dashboard. No ports to expose.

## Tools — current + how to add more

| Capability | Env required | Tools | Lane |
|---|---|---|---|
| GitHub | `GITHUB_TOKEN`, `GITHUB_REPO` | `github_list_issues`, `github_create_issue` 🔒 | dev |
| Sentry | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | `sentry_list_issues` | dev |
| Linear | `LINEAR_API_KEY` | `linear_list_issues`, `linear_create_issue` 🔒 | pm, support |
| Notion | `NOTION_API_KEY` | `notion_search` | support |
| Product | `PRODUCT_API_URL`, `PRODUCT_API_TOKEN` | `product_generate_campaign` 🔒 | marketing |

🔒 = requires human approval.

**Add a tool:** create `src/tools/<thing>.ts` exporting a factory that returns
`OpsTool[]` (self-guard on its env), register it in `src/tools/index.ts` under a
capability key, and add that capability to a profile in `src/profiles.ts`. Set
`gated: true` for anything that writes/spends.

> The `product` tool calls your product's `/api/campaigns/generate`, which today
> uses session auth. To drive it from the bot, add a `Authorization: Bearer
> <token>` path to that route that resolves a fixed org, then set
> `PRODUCT_API_TOKEN`. Until then leave it unset — the Marketing agent just
> writes copy directly.

## Guardrails built in

- **Human-in-the-loop** on every gated tool (5-minute auto-deny on no response).
- **Loop prevention** — bot/self messages are ignored, so agents can't spiral.
- **Tool allowlist** — agents can't touch anything not explicitly granted.
- **Thread-scoped context** — only the last ~20 replies are sent to Claude, to
  keep cost and confusion down.
- **Per-lane models** — Sonnet for high-volume Support; Opus where reasoning pays.

## Cost control

Put a hard monthly cap on the Anthropic API key, and keep Support on Sonnet.
Each mention = one agent run (a few cents typically; more if it calls tools).
