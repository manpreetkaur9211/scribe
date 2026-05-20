# Bedrock Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap `@ai-sdk/anthropic` for `@ai-sdk/amazon-bedrock` so the app routes AI spend through AWS billing instead of a direct Anthropic API key.

**Architecture:** Replace the provider package, update env validation, and update the model ID. The Vercel AI SDK's Bedrock provider has an identical interface to the Anthropic one — `streamText`, `toTextStreamResponse()`, and the exported `anthropic` factory are all unchanged from the call-site perspective.

**Tech Stack:** Next.js 16, Vercel AI SDK (`ai@^6`), `@ai-sdk/amazon-bedrock`, Zod, Vitest

---

## File Map

| File | Action | What changes |
|---|---|---|
| `package.json` | Modify | Remove `@ai-sdk/anthropic`, add `@ai-sdk/amazon-bedrock` |
| `lib/env.ts` | Modify | Replace `ANTHROPIC_API_KEY` with three AWS vars |
| `lib/claude.ts` | Modify | Use `createAmazonBedrock`, configure with AWS env vars |
| `app/api/generate-note/route.ts` | Modify | Update model ID to Bedrock format |
| `__tests__/env.test.ts` | Modify | Update to test AWS vars instead of `ANTHROPIC_API_KEY` |
| `__tests__/generate-note.test.ts` | Modify | Update mock to `@ai-sdk/amazon-bedrock` |
| `.env` | Modify | Replace `ANTHROPIC_API_KEY` with three AWS vars |

---

## Task 1: Update env validation and its tests (TDD)

**Files:**
- Modify: `__tests__/env.test.ts`
- Modify: `lib/env.ts`

- [ ] **Step 1: Rewrite the env tests to target AWS vars**

Replace the full contents of `__tests__/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when AWS_ACCESS_KEY_ID is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', '')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    await expect(import('../lib/env')).rejects.toThrow('AWS_ACCESS_KEY_ID')
  })

  it('throws when AWS_SECRET_ACCESS_KEY is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', '')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    await expect(import('../lib/env')).rejects.toThrow('AWS_SECRET_ACCESS_KEY')
  })

  it('throws when AWS_REGION is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret')
    vi.stubEnv('AWS_REGION', '')
    await expect(import('../lib/env')).rejects.toThrow('AWS_REGION')
  })

  it('returns validated env when all AWS vars are present', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    const { env } = await import('../lib/env')
    expect(env.AWS_ACCESS_KEY_ID).toBe('AKIAIOSFODNN7EXAMPLE')
    expect(env.AWS_SECRET_ACCESS_KEY).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    expect(env.AWS_REGION).toBe('us-east-1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/env.test.ts
```

Expected: all 4 tests FAIL (env module still expects `ANTHROPIC_API_KEY`)

- [ ] **Step 3: Update `lib/env.ts`**

Replace the full contents of `lib/env.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(
    `Missing required environment variables:\n${parsed.error.issues.map(i => i.message).join('\n')}`
  )
}

export const env = parsed.data
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/env.test.ts
```

Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts __tests__/env.test.ts
git commit -m "feat: replace ANTHROPIC_API_KEY env var with AWS Bedrock credentials"
```

---

## Task 2: Swap the provider package and update the client

**Files:**
- Modify: `package.json`
- Modify: `lib/claude.ts`

- [ ] **Step 1: Install `@ai-sdk/amazon-bedrock` and remove `@ai-sdk/anthropic`**

```bash
npm install @ai-sdk/amazon-bedrock
npm uninstall @ai-sdk/anthropic
```

- [ ] **Step 2: Update `lib/claude.ts`**

Replace the full contents of `lib/claude.ts`:

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { env } from './env'

export const anthropic = createAmazonBedrock({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/claude.ts
git commit -m "feat: swap @ai-sdk/anthropic for @ai-sdk/amazon-bedrock"
```

---

## Task 3: Update the model ID in the route

**Files:**
- Modify: `app/api/generate-note/route.ts`
- Modify: `__tests__/generate-note.test.ts`

- [ ] **Step 1: Update the mock in `__tests__/generate-note.test.ts`**

The test mocks `@ai-sdk/anthropic` — change it to `@ai-sdk/amazon-bedrock` and update the `env` mock. Replace the mock block at the top of the file (lines 3–19):

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/env', () => ({
  env: {
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    AWS_REGION: 'us-east-1',
  },
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toTextStreamResponse: () =>
      new Response('stream', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
  }),
}))

vi.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: () => () => 'mocked-model',
}))
```

- [ ] **Step 2: Run generate-note tests to verify they fail**

```bash
npm test -- __tests__/generate-note.test.ts
```

Expected: FAIL (route still references old model ID / old mock module name)

- [ ] **Step 3: Update the model ID in the route**

In `app/api/generate-note/route.ts`, change line 33:

```typescript
// Before
model: anthropic('claude-sonnet-4-6'),

// After
model: anthropic('anthropic.claude-sonnet-4-6-20251001-v1:0'),
```

- [ ] **Step 4: Run generate-note tests to verify they pass**

```bash
npm test -- __tests__/generate-note.test.ts
```

Expected: 4/4 PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/generate-note/route.ts __tests__/generate-note.test.ts
git commit -m "feat: update model ID to Bedrock format for claude-sonnet-4-6"
```

---

## Task 4: Update environment files

**Files:**
- Modify: `.env`

- [ ] **Step 1: Update `.env`**

Replace the contents of `.env` with your actual AWS credentials:

```
AWS_ACCESS_KEY_ID=<your-iam-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-iam-secret-access-key>
AWS_REGION=us-east-1
```

- [ ] **Step 2: Verify `.env` is in `.gitignore`**

```bash
grep -n "\.env" .gitignore
```

Expected: `.env` or `.env*` appears — if not, add `.env` to `.gitignore` before continuing.

- [ ] **Step 3: Verify the dev server starts without env errors**

```bash
npm run dev
```

Expected: server starts, no `Missing required environment variables` error in the terminal.

- [ ] **Step 4: Set env vars in Vercel**

In the Vercel dashboard for this project, add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `us-east-1`)

Remove `ANTHROPIC_API_KEY` if it exists.

- [ ] **Step 5: Verify no `ANTHROPIC_API_KEY` reference remains**

```bash
grep -r "ANTHROPIC_API_KEY" --include="*.ts" --include="*.tsx" --include="*.env*" .
```

Expected: zero matches (excluding `node_modules` and spec/plan docs)

---

## Self-Review

**Spec coverage check:**
- ✅ `package.json`: Task 2 Step 1
- ✅ `lib/env.ts`: Task 1 Step 3
- ✅ `lib/claude.ts`: Task 2 Step 2
- ✅ `app/api/generate-note/route.ts` model ID: Task 3 Step 3
- ✅ `.env`: Task 4 Step 1
- ✅ Vercel env vars: Task 4 Step 4
- ✅ No `ANTHROPIC_API_KEY` reference remains: Task 4 Step 5

**Placeholder scan:** No TBDs. `.env` step uses `<your-...>` as a deliberate placeholder for actual secrets — this is intentional, not a plan gap.

**Type consistency:** `createAmazonBedrock` returns a provider function; calling `anthropic('model-id')` returns a `LanguageModelV1` — consistent with how `streamText` consumes it across all tasks.
