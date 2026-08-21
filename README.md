# ClinScribe Preview

Real-time AI clinical note generation from speech — a working prototype of core Clinical scribe workflow.

A clinician speaks (or runs a demo consultation), and a structured clinical note streams into view in real-time using the Claude API. The note is editable inline and copyable to clipboard.

**[→ Live demo](https://scribe-black.vercel.app/)**

---

## How it works

Two data flows power the app:

```
Live mode:
  Browser mic → Web Speech API → transcript state
    → POST /api/generate-note → Claude (streamText) → note sections stream in

Demo mode:
  GET /api/demo-transcript (SSE, word-by-word, ~80ms delay)
    → transcript state → POST /api/generate-note → Claude (streamText) → note sections stream in
```

State lives in `useWorkspace` — two discriminated-union state machines (`TranscriptState`, `NoteState`) managed by `useReducer`. No external state library.

The AI note generation uses sentinel-based streaming: Claude outputs `[SECTION:chiefComplaint]` prefixes, and the client-side stream parser slices them in real-time to populate note sections as they arrive.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 App Router | SSR landing page, Edge API routes for low-latency streaming |
| UI | React 19 + TypeScript (strict) | Streaming state, discriminated unions for state machines |
| AI | Claude API via Vercel AI SDK `streamText` | Structured note generation with real-time streaming |
| Speech | Web Speech API (browser-native) | Live mode STT — no backend dependency |
| Demo feed | `ReadableStream` SSE via Next.js Route Handler | Simulates real-time STT feed without external service |
| Styling | Tailwind CSS | Rapid iteration, consistent design tokens |
| Testing | Vitest + @testing-library/react | Fast, ESM-native — 34 tests across 6 files |
| Deploy | Vercel (Edge runtime for API routes) | Zero cold-start on note generation stream |

---

## Local setup

```bash
git clone https://github.com/manpreetkaur9211/scribe
cd scribe
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test           # run all 34 tests
npm run test:watch # watch mode
```

---

## In production

This prototype uses Web Speech API and simulated SSE for speech input. A production system would use:

- **Real STT:** Deepgram or AssemblyAI streaming WebSocket feed for sub-100ms partial transcripts
- **WebSocket transport:** Bidirectional connection for live partial/final transcript events
- **EHR push:** Epic/Athenahealth API integration to push the final note to chart
- **Auth:** Clinician authentication with httpOnly cookie sessions (not localStorage)
- **Persistence:** Note drafts saved per-patient per-encounter

---

*Built by [Manpreet Kaur](https://linkedin.com/in/manpreet-kaur) as a showcase for Senior Full Stack Engineer role.*
