# 0005. ops-agents as a standalone service inside this repository

Status: Accepted
Date: 2026-06-04

## Context

Internal team operations (support triage, PM backlog grooming, dev issue/error monitoring, marketing content dogfooding) benefit from Claude-backed Slack agents, but this need is unrelated to the product's own runtime and has a different deployment shape: an always-on worker rather than a serverless request/response app.

## Decision

Build `ops-agents/` as its own Node package (own `package.json`, own `tsconfig.json`) inside this repository, using Slack Bolt in Socket Mode (no public URL or webhook signing needed) and the Claude Agent SDK's `query()` for the agent loop. It is explicitly documented as temporary residency: the README states it should be lifted into its own repository before real use, and it ships here only so it survives the ephemeral build container during development. The product app's typecheck excludes it, and nothing in the product imports from it.
Source: `ops-agents/README.md` ("Why this design", "This is a standalone service..."), `ops-agents/package.json`, `ops-agents/tsconfig.json`

## Alternatives considered

**Build it as Next.js API routes in the main app**, using HTTP webhooks instead of Socket Mode. Rejected per `ops-agents/README.md`: "an always-on worker needs no public URL, no signing-secret dance, and no serverless timeout (the product app couldn't do this; a standalone box can)" — Vercel's serverless function timeout is a hard constraint the always-on Slack connection can't work within.

## Consequences

**Benefits:** the product app's build, typecheck, and deploy are entirely unaffected by ops-agents' dependencies (`@slack/bolt`, `@anthropic-ai/claude-agent-sdk`, `tsx`) or its runtime behavior. Each can be developed, tested, and reasoned about independently.

**Limitations:** this repository now documents and enforces standards (this file included) for two codebases with different lifecycles under one root, which adds a small amount of "which rules apply where" overhead — for example, this Phase 3 standardization pass explicitly scoped `scripts/check-env.mjs` to skip `ops-agents/` rather than try to reconcile two separate env surfaces under one check. `ops-agents/.env.example` and its own env usage are correct but not yet covered by an automated check-env of their own.

**What would make this worth revisiting:** the README's own stated intent — once ops-agents is actually extracted into its own repository, this record's status should be marked Superseded and a decision record for wherever it lands should replace it.
