# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server on http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm test             # run all tests once (vitest run)
npm run test:watch   # vitest in watch mode
npm run test:coverage

# Run a single test file
npx vitest run __tests__/parse-note-stream.test.ts
```

## Environment

Live AI generation optionally uses `.env.local` with:
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

`lib/env.ts` validates these on demand with getBedrockEnv; missing credentials do not block the sample demo. The app uses AWS Bedrock (via `@ai-sdk/amazon-bedrock`) to call Claude — not the Anthropic API directly.

## Architecture

### Data flow

Two modes, same downstream pipeline:

- **Live:** Browser mic → Web Speech API → `useSpeechRecognition` → transcript state
- **Demo:** `GET /api/demo-transcript` (SSE, word-by-word, 80ms delay) → transcript state

Both feed into: `POST /api/generate-note` → Claude via `streamText` → sentinel-parsed sections stream into note state.

### State machines

All state lives in `useWorkspace` (`hooks/useWorkspace.ts`), which combines two `useReducer`-based machines:

- `TranscriptState`: `idle | recording | demo-playing | done`
- `NoteState`: `idle | streaming | done | editing | error`

Both are discriminated unions defined in `types/workspace.ts`. State transitions are pure reducer functions — no side effects inside.

### Sentinel streaming protocol

Claude outputs `[SECTION:sectionKey]` prefixes in its response. The client streams text and `lib/parse-note-stream.ts` parses sections incrementally:

- `parseCompleteSections` — extracts sections where the next sentinel has already arrived (offset-tracked to avoid O(N²) re-scanning)
- `parseFinalSection` — extracts the last section after the stream closes

Section keys and display labels per template are defined in `lib/note-sections.ts`. Prompts are in `lib/prompts.ts`.

### API routes

Both routes run on the Edge runtime (`export const runtime = 'edge'`):

- `app/api/generate-note/route.ts` — validates `{ transcript, template }` with Zod, calls `streamText` with Claude Opus 4.6 through getBedrockProvider. Demo requests stream prepared notes from lib/demo-notes.ts without credentials
- `app/api/demo-transcript/route.ts` — SSE stream of a canned script from `lib/demo-scripts.ts`, one word every 80ms

### Templates

Three templates: `gp-note`, `specialist-referral`, `ed-triage`. Each maps to a set of section keys (see `lib/note-sections.ts` and `types/workspace.ts`). Template selection happens in `components/TemplateSelector.tsx`.

### Path alias

`@/` maps to the repo root (set in `tsconfig.json`). Use `@/lib/...`, `@/types/...`, `@/components/...` etc.

## Testing

Tests live in `__tests__/`. Vitest is configured with jsdom. React component tests use `@testing-library/react`. The env test (`__tests__/env.test.ts`) stubs `process.env` — always call `unstubAllEnvs` in `afterEach` to avoid leaking env state across tests.

Live mode is disabled by default. After verifying working Bedrock access, set LIVE_AI_ENABLED=true along with all three AWS variables. The server passes only an availability boolean to the UI; credentials stay on the server. Both the landing button and live API enforce this setting.
