# ClinScribe Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 app that lets a user speak (or run a demo) and watch a streaming AI clinical note generated in real-time from their transcript, with inline editing and clipboard copy.

**Architecture:** Single-page app (`app/page.tsx` server component → `AppShell` client component) with two views: a landing page with "Try Live" / "Run Demo" CTAs, and a side-by-side workspace (dark transcript panel left, light note panel right). State lives in `useWorkspace` hook via two discriminated-union state machines. Two API routes: `POST /api/generate-note` (Vercel AI SDK + Claude) and `GET /api/demo-transcript` (SSE word-by-word stream).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS, Vercel AI SDK (`ai`), `@ai-sdk/anthropic`, Zod, Vitest, `@testing-library/react`

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.example`, `.gitignore`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd C:/Users/SuperPc/workspace
npx create-next-app@latest clinscribe-preview \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --turbopack
cd clinscribe-preview
```

Expected: project created, `npm run dev` starts on port 3000.

- [ ] **Step 2: Install dependencies**

```bash
npm install ai @ai-sdk/anthropic zod
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Create .env.example**

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

- [ ] **Step 6: Update .gitignore**

Append to `.gitignore`:
```
.env
.env.local
.superpowers/
```

- [ ] **Step 7: Verify scaffold**

```bash
npm run dev
```

Expected: Next.js dev server starts, default page loads at http://localhost:3000. Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 project with Vitest"
```

---

## Task 2: Types & Env Validation

**Files:**
- Create: `types/workspace.ts`
- Create: `lib/env.ts`

- [ ] **Step 1: Write the failing test for env validation**

Create `__tests__/env.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    await expect(import('../lib/env')).rejects.toThrow('ANTHROPIC_API_KEY')
  })

  it('returns validated env when ANTHROPIC_API_KEY is present', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
    const { env } = await import('../lib/env')
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test-key')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/env.test.ts
```

Expected: FAIL — `Cannot find module '../lib/env'`

- [ ] **Step 3: Create types/workspace.ts**

```ts
export type AppMode = 'landing' | 'live' | 'demo'

export type TemplateId = 'gp-note' | 'specialist-referral' | 'ed-triage'

export type GPNoteSections = {
  chiefComplaint: string
  hpi: string
  assessment: string
  plan: string
}

export type SpecialistReferralSections = {
  referralReason: string
  clinicalHistory: string
  currentMedications: string
  assessment: string
  urgency: string
}

export type EDTriageSections = {
  chiefComplaint: string
  mechanism: string
  vitals: string
  assessment: string
  disposition: string
}

export type NoteSections = GPNoteSections | SpecialistReferralSections | EDTriageSections

export type TranscriptState =
  | { status: 'idle' }
  | { status: 'recording'; partials: string; finals: string }
  | { status: 'demo-playing'; text: string; cursor: number }
  | { status: 'done'; text: string }

export type NoteState =
  | { status: 'idle' }
  | { status: 'streaming'; sections: Partial<NoteSections> }
  | { status: 'done'; sections: NoteSections }
  | { status: 'editing'; sections: NoteSections }
  | { status: 'error'; message: string }

export type DemoScriptId = 'gp-chest-pain' | 'specialist-cardio' | 'ed-trauma'

export interface DemoScript {
  id: DemoScriptId
  defaultTemplate: TemplateId
  text: string
}
```

- [ ] **Step 4: Create lib/env.ts**

```ts
import { z } from 'zod'

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(
    `Missing required environment variables:\n${parsed.error.issues.map(i => i.message).join('\n')}`
  )
}

export const env = parsed.data
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- __tests__/env.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add types/workspace.ts lib/env.ts __tests__/env.test.ts vitest.config.ts vitest.setup.ts
git commit -m "feat: add workspace types, env validation"
```

---

## Task 3: Demo Scripts & Claude Client

**Files:**
- Create: `lib/demo-scripts.ts`
- Create: `lib/claude.ts`

- [ ] **Step 1: Write failing test for demo scripts**

Create `__tests__/demo-scripts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { demoScripts, getDemoScript } from '../lib/demo-scripts'

describe('demo scripts', () => {
  it('exports three scripts', () => {
    expect(demoScripts).toHaveLength(3)
  })

  it('each script has id, defaultTemplate, and text with at least 100 words', () => {
    for (const script of demoScripts) {
      expect(script.id).toBeDefined()
      expect(script.defaultTemplate).toBeDefined()
      expect(script.text.split(' ').length).toBeGreaterThanOrEqual(100)
    }
  })

  it('getDemoScript returns script by id', () => {
    const script = getDemoScript('gp-chest-pain')
    expect(script.id).toBe('gp-chest-pain')
    expect(script.defaultTemplate).toBe('gp-note')
  })

  it('getDemoScript throws for unknown id', () => {
    // @ts-expect-error testing invalid input
    expect(() => getDemoScript('unknown')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/demo-scripts.test.ts
```

Expected: FAIL — `Cannot find module '../lib/demo-scripts'`

- [ ] **Step 3: Create lib/demo-scripts.ts**

```ts
import type { DemoScript, DemoScriptId } from '@/types/workspace'

export const demoScripts: DemoScript[] = [
  {
    id: 'gp-chest-pain',
    defaultTemplate: 'gp-note',
    text: `Patient is a 45 year old male presenting with substernal chest pain for the past three days. He describes the pain as a dull pressure, rated 4 out of 10 in severity. The pain is non-radiating and does not travel to the arm or jaw. He reports the pain is relieved by antacids and worsens after large meals, particularly spicy food. He denies shortness of breath, diaphoresis, nausea, or vomiting. No history of cardiac disease, hypertension, or diabetes. He is a non-smoker and drinks alcohol occasionally. Family history is unremarkable for early cardiac disease. Current medications include occasional ibuprofen for back pain. On further questioning he reports some mild reflux symptoms over the past few weeks. He has not had any similar episodes in the past. He works as an office manager and rates his stress levels as moderate. Vital signs today are stable with blood pressure 128 over 82, heart rate 76, temperature 36.8, oxygen saturation 98 percent on room air.`,
  },
  {
    id: 'specialist-cardio',
    defaultTemplate: 'specialist-referral',
    text: `Patient is a 68 year old female presenting for cardiology follow-up six weeks post non-ST elevation myocardial infarction. She was discharged on dual antiplatelet therapy with aspirin 100 milligrams daily and ticagrelor 90 milligrams twice daily, along with atorvastatin 80 milligrams, ramipril 5 milligrams, and bisoprolol 2.5 milligrams. She reports compliance with all medications. She is experiencing mild exertional dyspnoea when climbing two flights of stairs, which is improved compared to her pre-admission baseline. She denies chest pain, orthopnoea, paroxysmal nocturnal dyspnoea, or ankle swelling. No bleeding complications from the antiplatelet therapy. She is attending cardiac rehabilitation twice weekly and finds it beneficial. She was a light smoker prior to her MI and has ceased completely since discharge. Her lipid panel from last week shows LDL of 1.8 millimoles per litre. Echocardiogram performed three weeks post discharge showed preserved ejection fraction of 55 percent with mild inferolateral hypokinesis.`,
  },
  {
    id: 'ed-trauma',
    defaultTemplate: 'ed-triage',
    text: `Patient is a 32 year old male presenting to the emergency department following a fall from a two metre ladder approximately one hour ago. He landed on his outstretched right hand. He complains of pain and swelling over the right wrist, rated 7 out of 10. He denies head strike, loss of consciousness, neck pain, or back pain. No numbness or tingling in the fingers. He is right hand dominant. Past medical history is nil significant. No regular medications and no known drug allergies. He had a tetanus booster four years ago. On examination he is alert and orientated, GCS 15. Vital signs: blood pressure 138 over 88, heart rate 92, temperature 36.6, oxygen saturation 99 percent on room air. Right wrist shows localised swelling and tenderness over the distal radius with anatomical snuffbox tenderness noted. Grip strength reduced on the right. Neurovascular examination of the hand is intact with normal capillary refill and sensation.`,
  },
]

export function getDemoScript(id: DemoScriptId): DemoScript {
  const script = demoScripts.find(s => s.id === id)
  if (!script) throw new Error(`Demo script not found: ${id}`)
  return script
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/demo-scripts.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Create lib/claude.ts**

```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { env } from './env'

export const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})
```

- [ ] **Step 6: Commit**

```bash
git add lib/demo-scripts.ts lib/claude.ts __tests__/demo-scripts.test.ts
git commit -m "feat: add demo scripts and Claude client"
```

---

## Task 4: API Route — demo-transcript (SSE)

**Files:**
- Create: `app/api/demo-transcript/route.ts`
- Create: `__tests__/demo-transcript.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/demo-transcript.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '../app/api/demo-transcript/route'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

describe('GET /api/demo-transcript', () => {
  it('returns 400 for missing script param', async () => {
    const req = new Request('http://localhost/api/demo-transcript')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 for invalid script param', async () => {
    const req = new Request('http://localhost/api/demo-transcript?script=invalid')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 SSE stream for valid script', async () => {
    const req = new Request('http://localhost/api/demo-transcript?script=gp-chest-pain')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/demo-transcript.test.ts
```

Expected: FAIL — `Cannot find module '../app/api/demo-transcript/route'`

- [ ] **Step 3: Create app/api/demo-transcript/route.ts**

```ts
import { z } from 'zod'
import { getDemoScript } from '@/lib/demo-scripts'
import type { DemoScriptId } from '@/types/workspace'

export const runtime = 'edge'

const querySchema = z.object({
  script: z.enum(['gp-chest-pain', 'specialist-cardio', 'ed-trauma']),
})

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ script: url.searchParams.get('script') })

  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const script = getDemoScript(parsed.data.script as DemoScriptId)
  const words = script.text.split(' ')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'word', text: word + ' ' })}\n\n`)
        )
        await new Promise(resolve => setTimeout(resolve, 80))
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/demo-transcript.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/demo-transcript/route.ts __tests__/demo-transcript.test.ts
git commit -m "feat: add demo-transcript SSE API route"
```

---

## Task 5: API Route — generate-note (Claude streaming)

**Files:**
- Create: `app/api/generate-note/route.ts`
- Create: `__tests__/generate-note.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/generate-note.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () =>
      new Response('stream', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
  }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => () => 'mocked-model',
}))

describe('POST /api/generate-note', () => {
  it('returns 400 when transcript is missing', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'gp-note' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when template is invalid', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Patient has chest pain', template: 'bad-template' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is too short', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'short', template: 'gp-note' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calls streamText and returns stream response for valid input', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const { streamText } = await import('ai')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Patient is a 45 year old male with chest pain for 3 days',
        template: 'gp-note',
      }),
    })
    const res = await POST(req)
    expect(streamText).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/generate-note.test.ts
```

Expected: FAIL — `Cannot find module '../app/api/generate-note/route'`

- [ ] **Step 3: Create lib/prompts.ts**

```ts
import type { TemplateId } from '@/types/workspace'

const SECTION_SENTINEL = (key: string) => `[SECTION:${key}]`

const SHARED_INSTRUCTIONS = `You are a clinical documentation assistant. Generate a structured clinical note from the consultation transcript below. Output each section sequentially, preceded by its sentinel tag on its own line. Be concise and clinically accurate. Do not add any text before the first sentinel or after the last section.`

export function buildNotePrompt(template: TemplateId, transcript: string): string {
  const sectionInstructions: Record<TemplateId, string> = {
    'gp-note': `
${SECTION_SENTINEL('chiefComplaint')}
Write 1-2 sentences summarising the chief complaint and duration.

${SECTION_SENTINEL('hpi')}
Write 3-5 sentences covering history of presenting illness: onset, character, severity, associated symptoms, relevant negatives.

${SECTION_SENTINEL('assessment')}
Write 1-3 sentences with the clinical assessment/differential.

${SECTION_SENTINEL('plan')}
Write a short bulleted plan covering investigations, treatment, and follow-up.`,

    'specialist-referral': `
${SECTION_SENTINEL('referralReason')}
Write 1-2 sentences stating the reason for specialist referral.

${SECTION_SENTINEL('clinicalHistory')}
Write 3-5 sentences summarising relevant clinical history.

${SECTION_SENTINEL('currentMedications')}
List current medications mentioned in the transcript.

${SECTION_SENTINEL('assessment')}
Write 1-2 sentences with the current clinical assessment.

${SECTION_SENTINEL('urgency')}
State the urgency of the referral (routine / urgent / semi-urgent) with one sentence of justification.`,

    'ed-triage': `
${SECTION_SENTINEL('chiefComplaint')}
Write 1-2 sentences stating the chief complaint and mechanism of injury/illness.

${SECTION_SENTINEL('mechanism')}
Describe the mechanism of injury or illness onset in 1-2 sentences.

${SECTION_SENTINEL('vitals')}
List the vital signs from the transcript.

${SECTION_SENTINEL('assessment')}
Write 1-2 sentences with the working diagnosis or clinical impression.

${SECTION_SENTINEL('disposition')}
State the recommended disposition (admit / discharge / observe / refer) with brief justification.`,
  }

  return `${SHARED_INSTRUCTIONS}

Template: ${template}

${sectionInstructions[template]}

---

TRANSCRIPT:
${transcript}`
}
```

- [ ] **Step 4: Create app/api/generate-note/route.ts**

```ts
import { streamText } from 'ai'
import { z } from 'zod'
import { anthropic } from '@/lib/claude'
import { buildNotePrompt } from '@/lib/prompts'

export const runtime = 'edge'

const bodySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(5000),
  template: z.enum(['gp-note', 'specialist-referral', 'ed-triage']),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { transcript, template } = parsed.data
  const prompt = buildNotePrompt(template, transcript)

  const result = await streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    maxTokens: 1024,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- __tests__/generate-note.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/generate-note/route.ts lib/prompts.ts __tests__/generate-note.test.ts
git commit -m "feat: add generate-note API route with Claude streaming"
```

---

## Task 6: Workspace State Machines

**Files:**
- Create: `hooks/useWorkspace.ts`
- Create: `__tests__/workspace.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/workspace.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from '../hooks/useWorkspace'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

describe('useWorkspace — transcript state machine', () => {
  it('starts in idle', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    expect(result.current.transcript.status).toBe('idle')
  })

  it('transitions idle → recording via startRecording', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    expect(result.current.transcript.status).toBe('recording')
  })

  it('appends partials in recording state', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendPartial('Patient '))
    const t = result.current.transcript
    if (t.status !== 'recording') throw new Error('expected recording')
    expect(t.partials).toBe('Patient ')
  })

  it('appends finals and clears partials in recording state', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendPartial('Patient pres'))
    act(() => result.current.appendFinal('Patient presents '))
    const t = result.current.transcript
    if (t.status !== 'recording') throw new Error('expected recording')
    expect(t.finals).toBe('Patient presents ')
    expect(t.partials).toBe('')
  })

  it('transitions recording → done via stopRecording', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendFinal('Patient has chest pain '))
    act(() => result.current.stopRecording())
    const t = result.current.transcript
    expect(t.status).toBe('done')
    if (t.status !== 'done') throw new Error('expected done')
    expect(t.text).toBe('Patient has chest pain ')
  })

  it('transitions any → idle via reset', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.reset())
    expect(result.current.transcript.status).toBe('idle')
  })
})

describe('useWorkspace — note state machine', () => {
  it('starts note in idle', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    expect(result.current.note.status).toBe('idle')
  })

  it('transitions to streaming via startNoteGeneration', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    expect(result.current.note.status).toBe('streaming')
  })

  it('appends section content during streaming', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    const n = result.current.note
    if (n.status !== 'streaming') throw new Error('expected streaming')
    expect((n.sections as Record<string, string>).chiefComplaint).toBe('Chest pain × 3 days')
  })

  it('transitions streaming → done via completeNote', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    act(() => result.current.appendNoteSection('hpi', 'Substernal, non-radiating'))
    act(() => result.current.appendNoteSection('assessment', 'Likely GORD'))
    act(() => result.current.appendNoteSection('plan', 'PPI trial, follow up 2 weeks'))
    act(() => result.current.completeNote())
    expect(result.current.note.status).toBe('done')
  })

  it('transitions done → editing via startEditing', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    expect(result.current.note.status).toBe('editing')
  })

  it('transitions editing → done via stopEditing', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    act(() => result.current.stopEditing())
    expect(result.current.note.status).toBe('done')
  })

  it('transitions streaming → error via setNoteError', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.setNoteError('Claude API error'))
    const n = result.current.note
    expect(n.status).toBe('error')
    if (n.status !== 'error') throw new Error('expected error')
    expect(n.message).toBe('Claude API error')
  })

  it('updates section content via updateSection', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    act(() => result.current.updateSection('chiefComplaint', 'Edited chest pain'))
    const n = result.current.note
    if (n.status !== 'editing') throw new Error('expected editing')
    expect((n.sections as Record<string, string>).chiefComplaint).toBe('Edited chest pain')
  })

  it('resets both machines via reset', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.startNoteGeneration())
    act(() => result.current.reset())
    expect(result.current.transcript.status).toBe('idle')
    expect(result.current.note.status).toBe('idle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/workspace.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useWorkspace'`

- [ ] **Step 3: Create hooks/useWorkspace.ts**

```ts
'use client'

import { useCallback, useReducer } from 'react'
import type { AppMode, NoteState, NoteSections, TranscriptState } from '@/types/workspace'

interface WorkspaceState {
  transcript: TranscriptState
  note: NoteState
}

type WorkspaceAction =
  | { type: 'START_RECORDING' }
  | { type: 'APPEND_PARTIAL'; text: string }
  | { type: 'APPEND_FINAL'; text: string }
  | { type: 'STOP_RECORDING' }
  | { type: 'START_DEMO'; text: string }
  | { type: 'ADVANCE_DEMO_CURSOR'; word: string }
  | { type: 'FINISH_DEMO' }
  | { type: 'START_NOTE_GENERATION' }
  | { type: 'APPEND_NOTE_SECTION'; key: string; content: string }
  | { type: 'COMPLETE_NOTE' }
  | { type: 'START_EDITING' }
  | { type: 'STOP_EDITING' }
  | { type: 'UPDATE_SECTION'; key: string; content: string }
  | { type: 'SET_NOTE_ERROR'; message: string }
  | { type: 'RESET' }

function transcriptReducer(state: TranscriptState, action: WorkspaceAction): TranscriptState {
  switch (action.type) {
    case 'START_RECORDING':
      return { status: 'recording', partials: '', finals: '' }
    case 'APPEND_PARTIAL':
      if (state.status !== 'recording') return state
      return { ...state, partials: action.text }
    case 'APPEND_FINAL':
      if (state.status !== 'recording') return state
      return { ...state, finals: state.finals + action.text, partials: '' }
    case 'STOP_RECORDING':
      if (state.status !== 'recording') return state
      return { status: 'done', text: state.finals + state.partials }
    case 'START_DEMO':
      return { status: 'demo-playing', text: '', cursor: 0 }
    case 'ADVANCE_DEMO_CURSOR':
      if (state.status !== 'demo-playing') return state
      return { ...state, text: state.text + action.word, cursor: state.cursor + 1 }
    case 'FINISH_DEMO':
      if (state.status !== 'demo-playing') return state
      return { status: 'done', text: state.text }
    case 'RESET':
      return { status: 'idle' }
    default:
      return state
  }
}

function noteReducer(state: NoteState, action: WorkspaceAction): NoteState {
  switch (action.type) {
    case 'START_NOTE_GENERATION':
      return { status: 'streaming', sections: {} }
    case 'APPEND_NOTE_SECTION':
      if (state.status !== 'streaming') return state
      return {
        ...state,
        sections: { ...state.sections, [action.key]: action.content },
      }
    case 'COMPLETE_NOTE':
      if (state.status !== 'streaming') return state
      return { status: 'done', sections: state.sections as NoteSections }
    case 'START_EDITING':
      if (state.status !== 'done') return state
      return { status: 'editing', sections: state.sections }
    case 'STOP_EDITING':
      if (state.status !== 'editing') return state
      return { status: 'done', sections: state.sections }
    case 'UPDATE_SECTION':
      if (state.status !== 'editing') return state
      return {
        ...state,
        sections: { ...state.sections, [action.key]: action.content } as NoteSections,
      }
    case 'SET_NOTE_ERROR':
      return { status: 'error', message: action.message }
    case 'RESET':
      return { status: 'idle' }
    default:
      return state
  }
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  return {
    transcript: transcriptReducer(state.transcript, action),
    note: noteReducer(state.note, action),
  }
}

const INITIAL_STATE: WorkspaceState = {
  transcript: { status: 'idle' },
  note: { status: 'idle' },
}

export function useWorkspace(_mode: AppMode) {
  const [state, dispatch] = useReducer(workspaceReducer, INITIAL_STATE)

  const startRecording = useCallback(() => dispatch({ type: 'START_RECORDING' }), [])
  const appendPartial = useCallback((text: string) => dispatch({ type: 'APPEND_PARTIAL', text }), [])
  const appendFinal = useCallback((text: string) => dispatch({ type: 'APPEND_FINAL', text }), [])
  const stopRecording = useCallback(() => dispatch({ type: 'STOP_RECORDING' }), [])
  const startDemo = useCallback((text: string) => dispatch({ type: 'START_DEMO', text }), [])
  const advanceDemoCursor = useCallback((word: string) => dispatch({ type: 'ADVANCE_DEMO_CURSOR', word }), [])
  const finishDemo = useCallback(() => dispatch({ type: 'FINISH_DEMO' }), [])
  const startNoteGeneration = useCallback(() => dispatch({ type: 'START_NOTE_GENERATION' }), [])
  const appendNoteSection = useCallback((key: string, content: string) => dispatch({ type: 'APPEND_NOTE_SECTION', key, content }), [])
  const completeNote = useCallback(() => dispatch({ type: 'COMPLETE_NOTE' }), [])
  const startEditing = useCallback(() => dispatch({ type: 'START_EDITING' }), [])
  const stopEditing = useCallback(() => dispatch({ type: 'STOP_EDITING' }), [])
  const updateSection = useCallback((key: string, content: string) => dispatch({ type: 'UPDATE_SECTION', key, content }), [])
  const setNoteError = useCallback((message: string) => dispatch({ type: 'SET_NOTE_ERROR', message }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    transcript: state.transcript,
    note: state.note,
    startRecording,
    appendPartial,
    appendFinal,
    stopRecording,
    startDemo,
    advanceDemoCursor,
    finishDemo,
    startNoteGeneration,
    appendNoteSection,
    completeNote,
    startEditing,
    stopEditing,
    updateSection,
    setNoteError,
    reset,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/workspace.test.ts
```

Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useWorkspace.ts __tests__/workspace.test.ts
git commit -m "feat: add useWorkspace state machines with full test coverage"
```

---

## Task 7: useSpeechRecognition Hook

**Files:**
- Create: `hooks/useSpeechRecognition.ts`
- Create: `__tests__/speech-recognition.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/speech-recognition.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock Web Speech API
const mockRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null as ((e: unknown) => void) | null,
  onerror: null as ((e: unknown) => void) | null,
  onend: null as (() => void) | null,
}

const MockSpeechRecognition = vi.fn(() => mockRecognition)

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(global, 'webkitSpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.resetModules()
})

describe('useSpeechRecognition', () => {
  it('reports isSupported true when SpeechRecognition exists', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    expect(result.current.isSupported).toBe(true)
  })

  it('calls recognition.start() when start() is called', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => result.current.start())
    expect(mockRecognition.start).toHaveBeenCalledOnce()
  })

  it('calls recognition.stop() when stop() is called', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => result.current.start())
    act(() => result.current.stop())
    expect(mockRecognition.stop).toHaveBeenCalledOnce()
  })

  it('calls onPartial for interim results', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onPartial = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial, onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => {
      mockRecognition.onresult?.({
        results: [
          Object.assign([{ transcript: 'hello ' }], { isFinal: false }),
        ],
        resultIndex: 0,
      })
    })
    expect(onPartial).toHaveBeenCalledWith('hello ')
  })

  it('calls onFinal for final results', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onFinal = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal, onError: vi.fn() })
    )
    act(() => {
      mockRecognition.onresult?.({
        results: [
          Object.assign([{ transcript: 'hello world ' }], { isFinal: true }),
        ],
        resultIndex: 0,
      })
    })
    expect(onFinal).toHaveBeenCalledWith('hello world ')
  })

  it('calls onError on recognition error', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onError = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError })
    )
    act(() => {
      mockRecognition.onerror?.({ error: 'not-allowed' })
    })
    expect(onError).toHaveBeenCalledWith('not-allowed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/speech-recognition.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useSpeechRecognition'`

- [ ] **Step 3: Create hooks/useSpeechRecognition.ts**

```ts
'use client'

import { useCallback, useEffect, useRef } from 'react'

interface SpeechRecognitionOptions {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (error: string) => void
}

export function useSpeechRecognition({ onPartial, onFinal, onError }: SpeechRecognitionOptions) {
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)

  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  const isSupported = SpeechRecognitionClass != null

  useEffect(() => {
    if (!SpeechRecognitionClass) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-AU'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex]
      const text = result[0].transcript
      if (result.isFinal) {
        onFinal(text)
      } else {
        onPartial(text)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError(event.error)
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => recognitionRef.current?.start(), [])
  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { isSupported, start, stop }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/speech-recognition.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useSpeechRecognition.ts __tests__/speech-recognition.test.ts
git commit -m "feat: add useSpeechRecognition hook with Web Speech API"
```

---

## Task 8: LandingView Component

**Files:**
- Create: `components/LandingView.tsx`

- [ ] **Step 1: Create components/LandingView.tsx**

```tsx
import type { AppMode } from '@/types/workspace'

interface LandingViewProps {
  onSelectMode: (mode: Exclude<AppMode, 'landing'>) => void
}

export function LandingView({ onSelectMode }: LandingViewProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Split background */}
      <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
        <div className="w-1/2 bg-[#0f172a]" />
        <div className="w-1/2 bg-[#f8fafc]" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Wordmark */}
        <div className="mb-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Clin</span>
            <span className="text-[#7c3aed]">Scribe</span>
          </h1>
        </div>

        {/* Description */}
        <p className="mb-12 text-center text-slate-400 text-lg max-w-md leading-relaxed">
          Real-time AI clinical note generation.
          <br />
          A prototype of{' '}
          <span className="text-white">Heidi&apos;s</span> core scribe workflow.
        </p>

        {/* CTAs */}
        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => onSelectMode('live')}
            className="flex-1 flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-4 px-6 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
            aria-label="Try live mode with microphone"
          >
            <MicIcon />
            Try Live
          </button>
          <button
            onClick={() => onSelectMode('demo')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-4 px-6 rounded-xl border border-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
            aria-label="Run a pre-recorded demo consultation"
          >
            <PlayIcon />
            Run Demo
          </button>
        </div>

        {/* Hint */}
        <p className="mt-6 text-xs text-slate-500 text-center">
          Live mode requires microphone permission
        </p>
      </div>

      {/* Footer */}
      <div className="relative pb-6 text-center text-xs text-slate-500">
        Built by{' '}
        <a
          href="https://linkedin.com/in/manpreet-kaur"
          className="underline hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manpreet Kaur
        </a>{' '}
        — applying to Heidi ·{' '}
        <a
          href="https://github.com/manpreet-kaur/clinscribe-preview"
          className="underline hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
```

- [ ] **Step 2: Verify it renders in dev server**

```bash
# Temporarily update app/page.tsx to render LandingView directly for a quick visual check:
npm run dev
```

Open http://localhost:3000. You should see nothing yet since AppShell isn't wired up — that's fine. Move on.

- [ ] **Step 3: Commit**

```bash
git add components/LandingView.tsx
git commit -m "feat: add LandingView component with split background and dual CTAs"
```

---

## Task 9: TranscriptPanel & RecordingControls Components

**Files:**
- Create: `components/TranscriptPanel.tsx`
- Create: `components/RecordingControls.tsx`

- [ ] **Step 1: Create components/TranscriptPanel.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { AppMode, TranscriptState } from '@/types/workspace'

interface TranscriptPanelProps {
  transcript: TranscriptState
  mode: Exclude<AppMode, 'landing'>
}

export function TranscriptPanel({ transcript, mode }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as text appends
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  const isLive = mode === 'live'
  const isRecording = transcript.status === 'recording'
  const isPlaying = transcript.status === 'demo-playing'
  const isActive = isRecording || isPlaying

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Transcript
        </span>
        <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
          {isRecording && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs text-red-400">Recording</span>
            </>
          )}
          {isPlaying && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              <span className="text-xs text-emerald-400">Playing demo</span>
            </>
          )}
          {!isLive && !isActive && transcript.status === 'idle' && (
            <span className="text-xs text-slate-500">Demo mode</span>
          )}
        </div>
      </div>

      {/* Transcript text */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Live transcript"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed"
      >
        {transcript.status === 'idle' && (
          <p className="text-slate-600 italic">
            {isLive
              ? 'Start recording to see the transcript here.'
              : 'Run the demo to see the transcript here.'}
          </p>
        )}

        {transcript.status === 'recording' && (
          <span>
            <span className="text-white">{transcript.finals}</span>
            <span className="text-amber-400">{transcript.partials}</span>
            <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" aria-hidden="true" />
          </span>
        )}

        {transcript.status === 'demo-playing' && (
          <span>
            <span className="text-white">{transcript.text}</span>
            <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" aria-hidden="true" />
          </span>
        )}

        {transcript.status === 'done' && (
          <span className="text-white">{transcript.text}</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create components/RecordingControls.tsx**

```tsx
import type { AppMode, NoteState, TranscriptState } from '@/types/workspace'

interface RecordingControlsProps {
  transcript: TranscriptState
  note: NoteState
  mode: Exclude<AppMode, 'landing'>
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onStartDemo: () => void
  onStopDemo: () => void
  onGenerateNote: () => void
  onReset: () => void
}

export function RecordingControls({
  transcript,
  note,
  mode,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onStartDemo,
  onStopDemo,
  onGenerateNote,
  onReset,
}: RecordingControlsProps) {
  const isGenerating = note.status === 'streaming'
  const noteReady = note.status === 'idle'

  return (
    <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
      {transcript.status === 'idle' && mode === 'live' && (
        <PrimaryButton onClick={onStartRecording}>
          <MicIcon /> Start Recording
        </PrimaryButton>
      )}

      {transcript.status === 'idle' && mode === 'demo' && (
        <PrimaryButton onClick={onStartDemo}>
          <PlayIcon /> Start Demo
        </PrimaryButton>
      )}

      {transcript.status === 'recording' && (
        <>
          <PrimaryButton onClick={onStopRecording} disabled={isGenerating}>
            Stop &amp; Generate Note
          </PrimaryButton>
          <GhostButton onClick={onCancelRecording}>Cancel</GhostButton>
        </>
      )}

      {transcript.status === 'demo-playing' && (
        <>
          <PrimaryButton
            onClick={onGenerateNote}
            disabled={isGenerating}
          >
            Generate Note
          </PrimaryButton>
          <GhostButton onClick={onStopDemo}>Stop Demo</GhostButton>
        </>
      )}

      {transcript.status === 'done' && (
        <>
          {noteReady && (
            <PrimaryButton onClick={onGenerateNote} disabled={isGenerating}>
              Generate Note
            </PrimaryButton>
          )}
          <GhostButton onClick={onReset} disabled={isGenerating}>
            Clear &amp; Start Over
          </GhostButton>
        </>
      )}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
    >
      {children}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/TranscriptPanel.tsx components/RecordingControls.tsx
git commit -m "feat: add TranscriptPanel and RecordingControls components"
```

---

## Task 10: TemplateSelector & NotePanel Components

**Files:**
- Create: `components/TemplateSelector.tsx`
- Create: `components/NotePanel.tsx`

- [ ] **Step 1: Create components/TemplateSelector.tsx**

```tsx
import type { NoteState, TemplateId } from '@/types/workspace'

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'gp-note', label: 'GP Note' },
  { id: 'specialist-referral', label: 'Specialist Referral' },
  { id: 'ed-triage', label: 'ED Triage' },
]

interface TemplateSelectorProps {
  value: TemplateId
  note: NoteState
  onChange: (template: TemplateId) => void
}

export function TemplateSelector({ value, note, onChange }: TemplateSelectorProps) {
  const isDisabled = note.status === 'streaming'

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="template-select" className="text-xs text-slate-500 font-medium sr-only">
        Note template
      </label>
      <select
        id="template-select"
        value={value}
        onChange={e => onChange(e.target.value as TemplateId)}
        disabled={isDisabled}
        className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Select note template"
      >
        {TEMPLATES.map(t => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Create lib/note-sections.ts**

```ts
import type { TemplateId } from '@/types/workspace'

export const SECTION_LABELS: Record<TemplateId, Record<string, string>> = {
  'gp-note': {
    chiefComplaint: 'Chief Complaint',
    hpi: 'History of Presenting Illness',
    assessment: 'Assessment',
    plan: 'Plan',
  },
  'specialist-referral': {
    referralReason: 'Reason for Referral',
    clinicalHistory: 'Clinical History',
    currentMedications: 'Current Medications',
    assessment: 'Assessment',
    urgency: 'Urgency',
  },
  'ed-triage': {
    chiefComplaint: 'Chief Complaint',
    mechanism: 'Mechanism',
    vitals: 'Vitals',
    assessment: 'Assessment',
    disposition: 'Disposition',
  },
}

export function getSectionKeys(template: TemplateId): string[] {
  return Object.keys(SECTION_LABELS[template])
}
```

- [ ] **Step 3: Create components/NotePanel.tsx**

```tsx
'use client'

import { useRef, useCallback } from 'react'
import type { NoteState, TemplateId } from '@/types/workspace'
import { SECTION_LABELS, getSectionKeys } from '@/lib/note-sections'

interface NotePanelProps {
  note: NoteState
  template: TemplateId
  onStartEditing: () => void
  onStopEditing: () => void
  onUpdateSection: (key: string, content: string) => void
}

export function NotePanel({
  note,
  template,
  onStartEditing,
  onStopEditing,
  onUpdateSection,
}: NotePanelProps) {
  const sectionKeys = getSectionKeys(template)
  const labels = SECTION_LABELS[template]

  const handleCopy = useCallback(async () => {
    if (note.status !== 'done' && note.status !== 'editing') return
    const sections = note.sections as Record<string, string>
    const text = sectionKeys
      .map(key => `${labels[key].toUpperCase()}\n${sections[key] ?? ''}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
  }, [note, sectionKeys, labels])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Clinical Note
        </span>
        {(note.status === 'done' || note.status === 'editing') && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-label="Copy full note to clipboard"
            aria-keyshortcuts="Control+Shift+C Meta+Shift+C"
          >
            <CopyIcon />
            Copy Note
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {note.status === 'idle' && (
          <p className="text-slate-400 italic text-sm">
            Generate a note from the transcript to see it here.
          </p>
        )}

        {note.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
            {note.message}
          </div>
        )}

        {(note.status === 'streaming' || note.status === 'done' || note.status === 'editing') &&
          sectionKeys.map(key => {
            const sections = note.sections as Record<string, string>
            const content = sections[key]
            const isStreaming = note.status === 'streaming' && content === undefined
            const isEditing = note.status === 'editing'

            return (
              <NoteSection
                key={key}
                label={labels[key]}
                content={content ?? ''}
                isStreaming={isStreaming}
                isEditable={isEditing}
                onFocus={onStartEditing}
                onBlur={(val) => {
                  onUpdateSection(key, val)
                  onStopEditing()
                }}
              />
            )
          })}
      </div>
    </div>
  )
}

interface NoteSectionProps {
  label: string
  content: string
  isStreaming: boolean
  isEditable: boolean
  onFocus: () => void
  onBlur: (value: string) => void
}

function NoteSection({ label, content, isStreaming, isEditable, onFocus, onBlur }: NoteSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      className="border-l-2 border-violet-400 pl-4"
      aria-busy={isStreaming}
    >
      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {isStreaming ? (
        <div className="space-y-2" aria-label={`Generating ${label}`}>
          <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <div
          ref={ref}
          contentEditable={isEditable}
          suppressContentEditableWarning
          onFocus={onFocus}
          onBlur={() => onBlur(ref.current?.innerText ?? '')}
          className={`text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[1.5rem] rounded px-1 -mx-1 ${
            isEditable
              ? 'outline outline-2 outline-violet-300 bg-violet-50 cursor-text'
              : 'cursor-default hover:bg-slate-50 transition-colors'
          }`}
          aria-label={`${label} — click to edit`}
          aria-multiline="true"
        >
          {content}
        </div>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/TemplateSelector.tsx components/NotePanel.tsx lib/note-sections.ts
git commit -m "feat: add TemplateSelector and NotePanel components"
```

---

## Task 11: Workspace & AppShell — Wire Everything Together

**Files:**
- Create: `components/Workspace.tsx`
- Create: `components/AppShell.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create components/Workspace.tsx**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { TranscriptPanel } from './TranscriptPanel'
import { NotePanel } from './NotePanel'
import { RecordingControls } from './RecordingControls'
import { TemplateSelector } from './TemplateSelector'
import type { AppMode, TemplateId } from '@/types/workspace'
import { getDemoScript } from '@/lib/demo-scripts'

interface WorkspaceProps {
  mode: Exclude<AppMode, 'landing'>
}

export function Workspace({ mode }: WorkspaceProps) {
  const [template, setTemplate] = useState<TemplateId>('gp-note')
  const {
    transcript, note,
    startRecording, appendPartial, appendFinal, stopRecording,
    startDemo, advanceDemoCursor, finishDemo,
    startNoteGeneration, appendNoteSection, completeNote,
    startEditing, stopEditing, updateSection, setNoteError, reset,
  } = useWorkspace(mode)

  const demoAbortRef = useRef<AbortController | null>(null)

  // Speech recognition (live mode only)
  const { isSupported, start: startSpeech, stop: stopSpeech } = useSpeechRecognition({
    onPartial: appendPartial,
    onFinal: appendFinal,
    onError: (err) => console.warn('Speech recognition error:', err),
  })

  const handleStartRecording = useCallback(() => {
    startRecording()
    startSpeech()
  }, [startRecording, startSpeech])

  const handleStopRecording = useCallback(() => {
    stopSpeech()
    stopRecording()
  }, [stopSpeech, stopRecording])

  const handleCancelRecording = useCallback(() => {
    stopSpeech()
    reset()
  }, [stopSpeech, reset])

  const handleStartDemo = useCallback(async () => {
    const script = getDemoScript(
      mode === 'demo' ? 'gp-chest-pain' : 'gp-chest-pain'
    )
    setTemplate(script.defaultTemplate)
    const abort = new AbortController()
    demoAbortRef.current = abort
    startDemo(script.text)

    try {
      const res = await fetch(`/api/demo-transcript?script=${script.id}`, {
        signal: abort.signal,
      })
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'word') advanceDemoCursor(json.text)
          if (json.type === 'done') finishDemo()
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') finishDemo()
    }
  }, [mode, startDemo, advanceDemoCursor, finishDemo])

  const handleStopDemo = useCallback(() => {
    demoAbortRef.current?.abort()
    finishDemo()
  }, [finishDemo])

  const handleGenerateNote = useCallback(async () => {
    const text =
      transcript.status === 'done'
        ? transcript.text
        : transcript.status === 'demo-playing'
        ? transcript.text
        : ''
    if (!text) return

    startNoteGeneration()

    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, template }),
      })

      if (!res.ok) {
        const body = await res.json()
        setNoteError(body.error ?? 'Failed to generate note')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Parse [SECTION:key] sentinels from buffer
        const sentinelRegex = /\[SECTION:(\w+)\]([\s\S]*?)(?=\[SECTION:|$)/g
        let match
        while ((match = sentinelRegex.exec(buffer)) !== null) {
          appendNoteSection(match[1], match[2].trim())
        }
      }
      completeNote()
    } catch {
      setNoteError('Network error — please try again')
    }
  }, [transcript, template, startNoteGeneration, appendNoteSection, completeNote, setNoteError])

  const handleTemplateChange = useCallback((t: TemplateId) => {
    setTemplate(t)
    if (note.status === 'done' || note.status === 'editing') {
      reset()
      // Keep transcript, only reset note — re-dispatch START_RECORDING won't help here
      // so we just let reset clear both; user can re-generate with new template
    }
  }, [note.status, reset])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        if (transcript.status === 'done' && note.status === 'idle') handleGenerateNote()
      }
      if (mod && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        // Copy handled in NotePanel via its own button
      }
      if (e.key === 'Escape') {
        if (transcript.status === 'recording') handleCancelRecording()
        if (transcript.status === 'demo-playing') handleStopDemo()
      }
      if (mod && e.key === 'Backspace') {
        if (note.status !== 'streaming' && transcript.status !== 'recording') reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [transcript, note, handleGenerateNote, handleCancelRecording, handleStopDemo, reset])

  // Auto-start demo on mount in demo mode
  useEffect(() => {
    if (mode === 'demo' && transcript.status === 'idle') {
      handleStartDemo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <div className="flex flex-col h-screen">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shrink-0">
        <span className="text-sm font-bold tracking-tight">
          <span className="text-slate-800">Clin</span>
          <span className="text-[#7c3aed]">Scribe</span>
        </span>
        <TemplateSelector value={template} note={note} onChange={handleTemplateChange} />
      </div>

      {/* Split panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: dark transcript panel */}
        <div className="flex flex-col w-1/2 border-r border-slate-800 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <TranscriptPanel transcript={transcript} mode={mode} />
          </div>
          <RecordingControls
            transcript={transcript}
            note={note}
            mode={mode}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onCancelRecording={handleCancelRecording}
            onStartDemo={handleStartDemo}
            onStopDemo={handleStopDemo}
            onGenerateNote={handleGenerateNote}
            onReset={reset}
          />
        </div>

        {/* Right: light note panel */}
        <div className="w-1/2 overflow-hidden">
          <NotePanel
            note={note}
            template={template}
            onStartEditing={startEditing}
            onStopEditing={stopEditing}
            onUpdateSection={updateSection}
          />
        </div>
      </div>

      {/* Live mode: warn if speech not supported */}
      {mode === 'live' && !isSupported && (
        <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-6 py-2 text-xs text-amber-700">
          Web Speech API is not supported in this browser. Try Chrome or Edge.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create components/AppShell.tsx**

```tsx
'use client'

import { useState } from 'react'
import { LandingView } from './LandingView'
import { Workspace } from './Workspace'
import type { AppMode } from '@/types/workspace'

export function AppShell() {
  const [mode, setMode] = useState<AppMode>('landing')

  return (
    <div className="min-h-screen">
      {mode === 'landing' ? (
        <LandingView onSelectMode={setMode} />
      ) : (
        <Workspace mode={mode} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update app/page.tsx**

Replace the default Next.js content with:

```tsx
import { AppShell } from '@/components/AppShell'

export default function Page() {
  return <AppShell />
}
```

- [ ] **Step 4: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClinScribe — AI Clinical Note Generator',
  description:
    'Real-time AI clinical note generation from speech. A prototype of the Heidi scribe workflow — built with React 19, Next.js 15, and the Claude API.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Update app/globals.css**

Replace default styles with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 6: Start dev server and verify end-to-end**

```bash
# Set up .env.local with your Anthropic API key first
cp .env.example .env.local
# Edit .env.local and add your real ANTHROPIC_API_KEY

npm run dev
```

Open http://localhost:3000. Verify:
1. Landing page loads with split background, "Try Live" and "Run Demo" buttons
2. Clicking "Run Demo" shows the workspace and auto-starts the demo transcript streaming
3. After transcript plays, clicking "Generate Note" streams a clinical note into the right panel
4. Clicking a note section makes it editable inline
5. "Copy Note" copies formatted text to clipboard
6. Keyboard shortcut `Cmd/Ctrl+Enter` triggers generate note
7. `Escape` stops demo; `Cmd/Ctrl+Backspace` clears everything

- [ ] **Step 7: Commit**

```bash
git add components/Workspace.tsx components/AppShell.tsx app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: wire up AppShell, Workspace — full app functional end-to-end"
```

---

## Task 12: Run All Tests & Type Check

**Files:** No new files

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass. If any fail, fix them before continuing.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Fix any type errors found**

Common issues to watch for:
- `window.SpeechRecognition` — add `/// <reference lib="dom" />` or ensure `tsconfig.json` includes `"lib": ["dom"]`
- `webkitSpeechRecognition` not on `Window` type — add a declaration in `types/workspace.ts`:
  ```ts
  declare global {
    interface Window {
      webkitSpeechRecognition: typeof SpeechRecognition
    }
  }
  ```

- [ ] **Step 4: Run lint**

```bash
npx next lint
```

Expected: Zero errors.

- [ ] **Step 5: Commit if any fixes were made**

```bash
git add -A
git commit -m "fix: resolve type errors and lint warnings"
```

---

## Task 13: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# ClinScribe Preview

Real-time AI clinical note generation from speech — a working prototype of [Heidi](https://heidihealth.com)'s core scribe workflow.

A clinician speaks (or runs a demo consultation), and a structured clinical note streams into view in real-time using the Claude API. The note is editable inline and copyable to clipboard.

**[→ Live demo](https://clinscribe.vercel.app)**

---

## Architecture

Two data flows power the app:

```
Live mode:
  Browser mic → Web Speech API → transcript state → POST /api/generate-note → Claude API (streamText) → note sections stream in

Demo mode:
  GET /api/demo-transcript (SSE, word-by-word) → transcript state → POST /api/generate-note → Claude API (streamText) → note sections stream in
```

State lives in `useWorkspace` — two discriminated-union state machines (`TranscriptState`, `NoteState`) managed by a `useReducer`. No external state library.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 App Router | SSR landing page, Edge API routes for low-latency streaming |
| UI | React 19 + TypeScript | Streaming state management, discriminated unions |
| AI | Claude API via Vercel AI SDK `streamText` | Structured note generation with real-time streaming |
| Speech | Web Speech API | Browser-native STT, no backend required |
| Demo feed | SSE via Next.js Route Handler | Simulates real-time STT feed without external service |
| Styling | Tailwind CSS | Rapid iteration, consistent tokens |
| Testing | Vitest + @testing-library/react | Fast, ESM-native unit + integration tests |
| Deploy | Vercel (Edge runtime) | Zero cold-start on note generation stream |

---

## Local Setup

```bash
git clone https://github.com/manpreet-kaur/clinscribe-preview
cd clinscribe-preview
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

---

## In Production

This prototype uses Web Speech API and simulated SSE for speech input. A production version would use:

- **Real STT:** Deepgram or AssemblyAI streaming WebSocket feed
- **WebSocket transport:** Bidirectional connection for live partial/final transcript events
- **EHR push:** Integration with Epic/Athenahealth APIs to push the final note to chart
- **Auth:** Clinician authentication with session management (httpOnly cookies, not localStorage)

---

*Built by [Manpreet Kaur](https://linkedin.com/in/manpreet-kaur) as a showcase for the Heidi Senior Full Stack Engineer role.*
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with architecture, setup, and production notes"
```

---

## Task 14: Deploy to Vercel

**Files:** No new files

- [ ] **Step 1: Push to GitHub**

```bash
gh repo create manpreet-kaur/clinscribe-preview --public --source=. --remote=origin --push
```

Or manually create the repo on GitHub and push:
```bash
git remote add origin https://github.com/manpreet-kaur/clinscribe-preview.git
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import `manpreet-kaur/clinscribe-preview`
3. Framework preset: Next.js (auto-detected)
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Click Deploy

- [ ] **Step 3: Verify live deployment**

Open the Vercel URL. Run through the full demo flow end-to-end:
1. Landing page loads
2. "Run Demo" starts and completes the transcript
3. "Generate Note" streams a clinical note
4. Inline edit works
5. Copy to clipboard works

- [ ] **Step 4: Update README with live URL**

Replace `https://clinscribe.vercel.app` with the actual Vercel deployment URL if different.

```bash
git add README.md
git commit -m "docs: update live URL in README"
git push
```

---

## Self-Review

### Spec Coverage Check

| Spec section | Task(s) covering it |
|---|---|
| File structure (§5.1) | Tasks 1, 8–11 — all files created |
| AppMode view state (§5.3) | Task 11 — AppShell owns `mode` state |
| TranscriptState machine (§6.1) | Task 6 — useWorkspace, all transitions |
| NoteState machine (§6.2) | Task 6 — useWorkspace, all transitions |
| NoteSections by template (§6.3) | Tasks 2, 10 — types + SECTION_LABELS |
| POST /api/generate-note (§7.1) | Task 5 — Zod validation, streamText, error shape |
| GET /api/demo-transcript (§7.2) | Task 4 — SSE stream, Zod validation |
| LandingView (§8.1) | Task 8 — split background, dual CTAs, footer |
| TranscriptPanel (§8.2) | Task 9 — ARIA live, partial/final rendering |
| NotePanel (§8.3) | Task 10 — shimmer, inline edit, copy |
| RecordingControls (§8.4) | Task 9 — all 5 transcript status variants |
| TemplateSelector (§8.5) | Task 10 — disabled during streaming |
| Keyboard shortcuts (§9) | Task 11 — Workspace useEffect |
| Demo scripts (§10) | Task 3 — 3 scripts, getDemoScript |
| Env validation (§11) | Task 2 — lib/env.ts, Zod, throws at boot |
| Testing plan (§12) | Tasks 2, 4, 5, 6, 7 |
| Deployment (§13) | Task 14 — Vercel + env secret |
| README (§14) | Task 13 |
| Accessibility (§15) | Tasks 9, 10 — ARIA live, aria-busy, focus rings |

All 15 spec sections covered. No gaps.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-19-clinscribe-preview.md
git commit -m "docs: add implementation plan"
```
