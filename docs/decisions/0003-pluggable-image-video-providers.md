# 0003. Pluggable stub/paid providers for image and video generation

Status: Accepted
Date: 2026-05-29

## Context

AI image generation (OpenAI `gpt-image-1`) and AI video rendering (Shotstack) both cost money per call and require API keys to be provisioned before they can be tested or demoed. The core product (copy generation, campaign planning, brand rendering with `@vercel/og`) does not depend on either.

UNKNOWN: original rationale not recorded, but the pattern is consistent enough across both `lib/design/imageProvider.ts` and `lib/video/videoProvider.ts` (same `stub` vs. named-paid-provider shape, same env-variable-driven selection) that it reads as a deliberate, repeated choice rather than two unrelated implementations.

## Decision

Both the image and video generation paths are implemented behind a provider interface selected by an environment variable (`IMAGE_PROVIDER`, `VIDEO_PROVIDER`), defaulting to a `stub` implementation that runs with zero external calls and zero cost. Setting `IMAGE_PROVIDER=openai` or `VIDEO_PROVIDER=shotstack` (plus the matching API key) switches to the real paid provider.
Source: `lib/design/imageProvider.ts`, `lib/video/videoProvider.ts`, `.env.example`

## Alternatives considered

UNKNOWN: not recorded.

## Consequences

**Benefits observed in the codebase today:** the app runs, builds, and its test suite passes with zero AI-image or video spend and no provider account required (confirmed: `npm run build` and `npm test` both succeed in this environment with `IMAGE_PROVIDER`/`VIDEO_PROVIDER` unset, which defaults to `stub`). New environments (local dev, CI, a fresh clone) work immediately without provisioning paid third-party accounts first.

**Limitations:** the stub path and the real-provider path are different code, so a bug that only manifests against the real OpenAI or Shotstack response shape will not be caught by tests running against the stub. `lib/video/videoProvider.test.ts` exists but its coverage of the real Shotstack path specifically was not verified in this pass.

**What would make this worth revisiting:** if the stub/real divergence causes a production bug that testing against the stub could not have caught, that's a concrete argument for either better real-provider test fixtures or contract tests against recorded responses.
