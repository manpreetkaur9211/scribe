# Bedrock Credentials — Design Spec

**Date:** 2026-05-19  
**Author:** Manpreet Kaur  
**Status:** Approved

---

## Goal

Replace the direct Anthropic API key with AWS Bedrock credentials so all AI spend routes through the existing AWS billing account. The app is deployed on Vercel, so credentials are static env vars (no IAM role assumption).

---

## Approach

Swap `@ai-sdk/anthropic` for `@ai-sdk/amazon-bedrock`. Both are first-party Vercel AI SDK providers with identical interfaces. No changes to route handler logic, streaming behaviour, or UI code.

---

## Changes

### 1. Dependencies (`package.json`)

- Remove: `@ai-sdk/anthropic`
- Add: `@ai-sdk/amazon-bedrock` (latest compatible with `ai@^6`)

### 2. Environment variables

Remove `ANTHROPIC_API_KEY`. Add:

| Variable | Required | Example |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | yes | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | yes | `wJalrX...` |
| `AWS_REGION` | yes | `us-east-1` |

Update `.env` locally and add all three to Vercel project settings.

### 3. `lib/env.ts`

Drop `ANTHROPIC_API_KEY` from the Zod schema. Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — all `z.string().min(1)`, all required.

### 4. `lib/claude.ts`

Replace `createAnthropic` from `@ai-sdk/anthropic` with `createAmazonBedrock` from `@ai-sdk/amazon-bedrock`. Configure with `accessKeyId`, `secretAccessKey`, `region` from `env`. The export name stays `anthropic` to avoid touching call sites.

### 5. `app/api/generate-note/route.ts`

Change the model string from `'claude-sonnet-4-6'` to `'anthropic.claude-sonnet-4-6-20251001-v1:0'` (Bedrock model ID).

---

## What does NOT change

- Route handler logic
- Streaming response format (`result.toTextStreamResponse()`)
- `runtime: 'edge'` — Bedrock provider supports edge runtime
- All other files (UI, hooks, tests, prompts)

---

## Out of scope

- IAM role-based auth (not applicable on Vercel)
- Cross-region inference profiles
- Bedrock model fallback / retry logic

---

## Success criteria

- `npm run build` succeeds with zero TypeScript errors
- `POST /api/generate-note` streams a note using Bedrock credentials
- No `ANTHROPIC_API_KEY` reference remains in the codebase
