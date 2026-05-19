# ClinScribe Preview — Design Spec

**Date:** 2026-05-19
**Author:** Manpreet Kaur
**Purpose:** Showcase project for Heidi Senior Full Stack Engineer application. A working prototype of Heidi's core product interaction pattern: speak → transcript → AI clinical note → edit → copy.

---

## 1. Project Overview

ClinScribe Preview is a Next.js 15 web app that demonstrates real-time AI clinical note generation from speech input. A clinician (or recruiter) speaks during a simulated consultation — or runs a pre-written demo script — and watches the transcript and AI-generated clinical note appear simultaneously in a split-panel interface.

**Live URL:** `clinscribe.vercel.app`
**Repo:** `github.com/manpreet-kaur/clinscribe-preview`

---

## 2. Goals

- Demonstrate React 19 + TypeScript depth with real-time streaming state management
- Show Claude API integration via Vercel AI SDK in a production-relevant context
- Signal product sensibility: complex AI workflow made to feel simple and clinical-grade
- Pass the a11y bar: ARIA live regions for streaming content, keyboard navigation
- Be deployable and demonstrable by a recruiter with zero technical setup

---

## 3. Non-Goals

- No authentication, no user accounts, no persistence
- No real STT service (Deepgram, AssemblyAI) — Web Speech API for live, SSE simulation for demo
- No EHR push integration
- No mobile app — responsive down to tablet (iPad), not phone

---

## 4. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Required by CLAUDE.md; SSR landing, Edge API routes |
| Language | TypeScript (strict) | Required by CLAUDE.md; discriminated unions for state machines |
| UI | React 19 | Required by CLAUDE.md; streaming state, concurrent features |
| Styling | Tailwind CSS | Rapid iteration, consistent design tokens |
| AI | Claude API via Vercel AI SDK `streamText` | Streaming note generation; matches Heidi's stack |
| Speech | Web Speech API (browser-native) | Live mode STT; no backend dependency |
| Demo feed | `ReadableStream` SSE from Next.js Route Handler | Simulates real-time STT feed without external service |
| Testing | Vitest + @testing-library/react | Unit + integration; fast, ESM-native |
| Deploy | Vercel (Edge runtime for API routes) | Lowest cold-start latency for streaming; free tier |

---

## 5. Architecture

### 5.1 File Structure

```
clinscribe-preview/
├── app/
│   ├── page.tsx                        # Server component — renders <AppShell />
│   ├── layout.tsx                      # Root layout, metadata, Inter font
│   ├── globals.css
│   └── api/
│       ├── generate-note/
│       │   └── route.ts                # POST — streams Claude via Vercel AI SDK
│       └── demo-transcript/
│           └── route.ts                # GET  — SSE stream of demo consultation text
├── components/
│   ├── AppShell.tsx                    # "use client" — owns view state (landing | live | demo)
│   ├── LandingView.tsx                 # Hero + dual CTA — purely presentational
│   ├── Workspace.tsx                   # Side-by-side layout shell — renders transcript + note panels
│   ├── TranscriptPanel.tsx             # Dark left panel — live/demo transcript display
│   ├── NotePanel.tsx                   # Light right panel — streaming note sections + inline edit
│   ├── RecordingControls.tsx           # Context-aware button strip below transcript
│   └── TemplateSelector.tsx           # Dropdown: GP Note / Specialist Referral / ED Triage
├── hooks/
│   ├── useWorkspace.ts                 # Central state — owns transcript + note state machines
│   └── useSpeechRecognition.ts         # Web Speech API wrapper
├── lib/
│   ├── claude.ts                       # Anthropic client singleton
│   ├── demo-scripts.ts                 # Pre-written consultation transcripts (3 scripts)
│   └── env.ts                          # Zod env validation — throws at boot if ANTHROPIC_API_KEY missing
├── types/
│   └── workspace.ts                    # Discriminated unions: TranscriptState, NoteState
└── __tests__/
    ├── workspace.test.ts               # State machine transition tests
    ├── speech-recognition.test.ts      # useSpeechRecognition hook tests
    └── generate-note.test.ts           # API route validation + stream shape tests
```

### 5.2 Component Tree

```
app/page.tsx (Server)
└── AppShell (Client — mode: 'landing' | 'live' | 'demo')
    ├── LandingView          [mode === 'landing']
    └── Workspace            [mode === 'live' | 'demo']
        ├── TemplateSelector
        ├── TranscriptPanel
        │   └── RecordingControls
        └── NotePanel
```

### 5.3 View State

`AppShell` owns a single `mode` state:

```ts
type AppMode = 'landing' | 'live' | 'demo'
```

- `landing`: LandingView renders, workspace is not mounted
- `live`: Workspace mounts, `useSpeechRecognition` initialises
- `demo`: Workspace mounts, demo SSE stream starts automatically

Transition: clicking "Try Live" or "Run Demo" on LandingView sets mode. No URL routing needed. Transition is animated (fade + slide up).

---

## 6. State Design

### 6.1 Transcript State Machine

```ts
type TranscriptState =
  | { status: 'idle' }
  | { status: 'recording'; partials: string; finals: string }
  | { status: 'demo-playing'; text: string; cursor: number }
  | { status: 'done'; text: string }
```

Transitions:
- `idle` → `recording`: user clicks "Start Recording", mic permission granted
- `idle` → `demo-playing`: mode is `demo`, SSE stream starts on mount
- `recording` → `done`: user clicks "Stop & Generate Note"
- `demo-playing` → `done`: SSE stream ends or user clicks "Stop Demo"
- any → `idle`: user clicks "Clear & Start Over"

### 6.2 Note State Machine

```ts
type NoteState =
  | { status: 'idle' }
  | { status: 'streaming'; sections: Partial<NoteSections> }
  | { status: 'done'; sections: NoteSections }
  | { status: 'editing'; sections: NoteSections }
  | { status: 'error'; message: string }
```

Transitions:
- `idle` → `streaming`: POST to `/api/generate-note` fired
- `streaming` → `done`: stream completes, all sections received
- `done` → `editing`: user clicks any note section
- `editing` → `done`: user clicks outside (blur)
- `streaming|done|editing` → `idle`: user clicks "Clear & Start Over"
- `streaming` → `error`: fetch failure or Claude API error

### 6.3 Note Sections by Template

```ts
type GPNoteSections = {
  chiefComplaint: string
  hpi: string
  assessment: string
  plan: string
}

type SpecialistReferralSections = {
  referralReason: string
  clinicalHistory: string
  currentMedications: string
  assessment: string
  urgency: string
}

type EDTriageSections = {
  chiefComplaint: string
  mechanism: string
  vitals: string
  assessment: string
  disposition: string
}

type NoteSections = GPNoteSections | SpecialistReferralSections | EDTriageSections
```

---

## 7. API Routes

### 7.1 `POST /api/generate-note`

**Runtime:** Edge

**Request body (Zod-validated):**
```ts
{
  transcript: string   // min 10 chars, max 5000 chars
  template: 'gp-note' | 'specialist-referral' | 'ed-triage'
}
```

**Behaviour:**
1. Validate with Zod — return `{ data: null, error: string }` with 400 on failure
2. Build system prompt matching the requested template's section structure
3. Call `streamText` from `ai` (Vercel AI SDK) with `anthropic('claude-sonnet-4-6')`
4. Return `result.toDataStreamResponse()` on success

**System prompt strategy:** Instructs Claude to output sections one at a time, each prefixed with a sentinel like `[SECTION:chiefComplaint]`. The client-side stream parser in `useWorkspace` splits on these sentinels to progressively populate `NoteState.sections`.

**Error shape:** `{ data: null, error: string }` at every async boundary — never throws across layers.

### 7.2 `GET /api/demo-transcript`

**Runtime:** Edge

**Query params (Zod-validated):**
```ts
{
  script: 'gp-chest-pain' | 'specialist-cardio' | 'ed-trauma'
}
```

**Behaviour:**
1. Validate query param
2. Look up the script from `lib/demo-scripts.ts`
3. Stream the script word-by-word as SSE events with ~80ms delay between words
4. Send a `[DONE]` event when complete

**SSE event format:**
```
data: {"type":"word","text":"Patient "}
data: {"type":"word","text":"presents "}
data: {"type":"done"}
```

---

## 8. Component Specifications

### 8.1 `LandingView`

- Full-viewport split: left half dark (`#0f172a`), right half light (`#f8fafc`) — previewing the workspace split
- Centre: "ClinScribe" wordmark, one-line description, two equal CTAs
- CTA left: "Try Live" with mic icon — triggers `setMode('live')`
- CTA right: "Run Demo" with play icon — triggers `setMode('demo')`
- Bottom: "Built by Manpreet Kaur — applying to Heidi · GitHub · LinkedIn" in small muted text
- No JS state needed — purely presentational, props: `{ onSelectMode: (mode: 'live' | 'demo') => void }`

### 8.2 `TranscriptPanel`

- Dark background (`#0f172a`), left panel
- Header: "TRANSCRIPT" label + recording indicator (pulsing red dot in live mode, play icon in demo mode)
- Text display:
  - `partials` rendered in amber (`#fbbf24`) — in-flux, still changing
  - `finals` rendered in white — confirmed
  - Blinking cursor at active position
  - ARIA live region: `<div role="log" aria-live="polite" aria-label="Live transcript">` — announces new final words to screen readers
- Empty state: "Start recording or run a demo to see the transcript here"
- Scroll: auto-scrolls to bottom as text appends

### 8.3 `NotePanel`

- Light background (`white`), right panel
- Header: "CLINICAL NOTE" label + "Copy Note" button (top-right, visible once note is `done`)
- Each section renders as a card:
  - Violet left border (`#7c3aed`)
  - Section label in violet, small caps
  - Content area: shimmer placeholder while streaming, text once section completes
- Inline editing: clicking content area in `done` state makes it `contentEditable`, transitions `NoteState` to `editing`
- `onBlur` on contentEditable saves the edited value back to state
- Empty state: "Generate a note from the transcript to see it here"

### 8.4 `RecordingControls`

Context-aware, sits below `TranscriptPanel`:

| Transcript status | Rendered controls |
|---|---|
| `idle` (live mode) | "Start Recording" (primary) |
| `recording` | "Stop & Generate Note" (primary) + "Cancel" (ghost) |
| `idle` (demo mode) | "Start Demo" (primary) — auto-starts on mount |
| `demo-playing` | "Stop Demo" (ghost) + "Generate Note" (primary, disabled until transcript has content) |
| `done` | "Generate Note" (primary, if note is idle) + "Clear & Start Over" (ghost) |

### 8.5 `TemplateSelector`

- Dropdown in workspace header, right-aligned
- Options: "GP Note", "Specialist Referral", "ED Triage"
- Changing template clears `NoteState` to `idle` if it is `done` or `editing` (not during `streaming`)
- Disabled during `streaming` state to prevent mid-stream template change

---

## 9. Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Cmd/Ctrl + Enter` | Trigger "Generate Note" | When transcript is `done` and note is `idle` |
| `Cmd/Ctrl + Shift + C` | Copy full note to clipboard | When note is `done` or `editing` |
| `Escape` | Cancel recording / stop demo | When `recording` or `demo-playing` |
| `Cmd/Ctrl + Backspace` | Clear & Start Over | Global, when not streaming |

---

## 10. Demo Scripts

Three pre-written consultations in `lib/demo-scripts.ts`, each ~150–200 words:

1. **`gp-chest-pain`** — GP consult, 45yo male, 3 days substernal chest pain, non-radiating, relieved by antacids, no cardiac history. Template: GP Note.
2. **`specialist-cardio`** — Cardiology follow-up, 68yo female, 6 weeks post-NSTEMI, medication review, mild exertional dyspnoea. Template: Specialist Referral.
3. **`ed-trauma`** — ED triage, 32yo male, fall from 2m ladder, right wrist pain, GCS 15, vitals stable. Template: ED Triage.

Each script maps to a default template. `TemplateSelector` pre-selects the matching template when demo mode starts.

---

## 11. Environment Variables

```bash
ANTHROPIC_API_KEY=     # Required. Validated at boot via Zod env check.
```

Env validation in `lib/env.ts` — if `ANTHROPIC_API_KEY` is missing the app throws at startup with a clear message. No silent failures at request time.

---

## 12. Testing Plan

| Test file | What it covers |
|---|---|
| `workspace.test.ts` | All state machine transitions for `TranscriptState` and `NoteState`. Every valid and invalid transition. |
| `speech-recognition.test.ts` | `useSpeechRecognition` hook: partial callback fires on interim results, final callback fires on final results, error state on permission denied. Web Speech API mocked as a browser global. |
| `generate-note.test.ts` | Zod validation rejects missing/invalid fields. Valid request returns a stream response. Anthropic client mocked — not calling the real API in tests. |

---

## 13. Deployment

- **Platform:** Vercel (GitHub integration, auto-deploy on push to `main`)
- **Runtime:** Edge for both API routes — eliminates cold-start delay on the note generation stream
- **Environment secrets:** `ANTHROPIC_API_KEY` set in Vercel project settings
- **Custom domain:** `clinscribe.vercel.app` (Vercel default subdomain)

---

## 14. README Structure

1. One-paragraph description referencing Heidi's core workflow
2. Live demo link
3. Architecture diagram (ASCII) — two data flows: Live and Demo
4. Tech stack table with rationale
5. Local setup: `git clone` → `cp .env.example .env` → `npm run dev`
6. "In production" section: real STT (Deepgram), WebSocket feed, EHR push
7. Footer: "Built by Manpreet Kaur as a showcase for Heidi's Senior Full Stack Engineer role · LinkedIn"

---

## 15. Accessibility

- `TranscriptPanel`: `role="log"` + `aria-live="polite"` for streaming transcript
- `NotePanel` sections: `aria-label` per section, `aria-busy="true"` during streaming
- All interactive elements keyboard-focusable with visible focus rings
- Keyboard shortcuts documented and announced via `aria-keyshortcuts`
- Colour contrast: all text meets WCAG AA (dark panel white text, light panel dark text)
