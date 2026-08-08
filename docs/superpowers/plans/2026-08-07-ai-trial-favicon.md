# Favicon and AI Trial Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Keep every checkbox updated and do not skip the security gates.

**Goal:** Add a real browser favicon and a local-first AI Trial Lab with two random challenge modes, user-supplied model credentials, safe multi-provider proxying, bounded sessions, self-evaluation, and IndexedDB transcript history.

**Architecture:** Keep the existing React/Vite SPA and add a small same-origin Vercel Function boundary under `api/ai/`. The browser sends validated public fields in JSON and the in-memory API key in a dedicated sensitive header; provider adapters translate OpenAI-compatible, Anthropic, and Gemini requests into one normalized text result. Static reviewed challenge data stays in the repository. Trial summaries remain in the versioned app data envelope; complete transcripts live in IndexedDB and are capped at the 20 newest sessions or 25 MB.

**Tech Stack:** React 18, TypeScript strict mode, Vite 5, React Router 6, Zod, native IndexedDB via `idb`, Vercel Node Functions, Vitest + React Testing Library, Playwright.

---

## Fixed Product Decisions

- The existing homepage visual redesign is out of scope; Stitch owns that visual direction.
- The existing `/lab` message diagnosis remains available.
- Add an AI Trial Lab under `/lab/ai`, linked from the existing Lab page and Lab navigation. Do not add a sixth bottom-nav item.
- Trial modes are `沟通试炼` and `Prompt 工程试炼`.
- Each mode has `简单`, `一般`, and `困难` challenge pools. A user chooses one mode and difficulty; the system randomly selects one reviewed challenge for the whole session. Rounds continue on that challenge; neither the challenge nor model changes mid-session.
- The user configures `OpenAI-compatible`, `Anthropic`, or `Gemini`, selects an official preset or a custom target, then enters a model ID and API key. Base URL is editable only for custom public HTTPS proxies and self-hosted gateways.
- Requests go through same-origin Vercel Functions. API keys exist only in React memory and one in-flight server request; never store, log, export, echo, or include them in error messages.
- Base URLs are not an unrestricted HTTP proxy. Allow only HTTPS, reject URL credentials/query/fragment, block private/reserved/loopback/link-local/metadata IPs after DNS resolution, pin the validated public address, disable redirects, and forward only adapter-defined paths and headers.
- The user selects a maximum of `5` to `30` rounds. One round is one accepted user submission plus one model response. The server rejects any request whose transcript exceeds the declared limit or byte/token budgets.
- Scoring is hybrid: deterministic checks are authoritative for format/length/required items; the same model performs an explicitly labelled self-evaluation. Never present the self-score as an objective benchmark.
- Complete transcripts are saved in IndexedDB only after the user sees the local-storage notice. Keep the 20 newest sessions or 25 MB, whichever is reached first. Provide per-session export/delete and delete-all.
- Do not add streaming, image/audio input, tool execution, model-to-model blind comparison, server-side transcript storage, or arbitrary HTTP methods in this iteration.

## Execution Rules

- Use red-green TDD for every behavior below: write one focused failing test, run it and confirm the expected failure, add the smallest implementation, then rerun that test before continuing. A task that says “implement” does not waive this order.
- Never mark a challenge reviewed, weaken a security assertion, or update a snapshot merely to make a test pass. Stop at the named human-review and deployment gates.
- Keep one feature commit per task. Do not include the repository's unrelated adult-content changes.

## Current Repository Seams

- `src/features/lab/MessageLabPage.tsx` is synchronous and calls `analyzeMessage()`; preserve it.
- `src/app/App.tsx` owns route registration and the onboarding gate.
- `src/components/layout/AppLayout.tsx` owns the five-item navigation and page context.
- `src/types/index.ts` is the domain type source of truth; mirror new persisted types in `src/schemas/`.
- `src/lib/storage/storage.ts` owns the `huiliao:v1` envelope. `src/lib/settings/AppDataContext.tsx` currently hardcodes `schemaVersion: 1` in reset paths and must be updated when summaries are added.
- `vercel.json` has a catch-all SPA rewrite. Vercel filesystem routes take precedence, so `/api/ai/*.ts` must remain real Node functions before the fallback.
- Existing privacy copy promises no remote training-text upload. The new feature must replace that absolute statement with a clear opt-in disclosure for AI Trial Lab input.

## File Map

Create:

- `public/favicon.svg`, `public/favicon.png`, `public/favicon.ico`, `public/apple-touch-icon.png` — browser icon sources and generated assets.
- `scripts/generate-favicon.mjs` — generate `public/favicon.png`, `public/favicon.ico`, and `public/apple-touch-icon.png` from the SVG.
- `src/content/ai-trials-draft.ts` — unreviewed challenge candidates; never import from production code.
- `src/content/ai-trials.ts` — human-approved challenge pool and immutable rubric metadata.
- `src/schemas/ai-trials.ts` — challenge, transcript, request, response, and evaluation schemas.
- `src/lib/ai/selectChallenge.ts` — injected-RNG selection with no-repeat behavior.
- `src/lib/ai/trialReducer.ts` — session state machine and 5–30 round invariant.
- `src/lib/ai/trialClient.ts` — browser client for same-origin endpoints; never logs credentials.
- `src/lib/ai/trialDb.ts` — IndexedDB database, quota cleanup, export, and delete operations.
- `src/lib/ai/trialChecks.ts` — parameterized deterministic checks.
- `src/features/lab/LabTabs.tsx` — shared links between message diagnosis and AI Trial Lab.
- `src/features/lab/AiTrialPage.tsx` — setup, active session, evaluation, and history views.
- `src/features/lab/aiTrial.css` — namespaced AI Trial Lab styles only.
- `api/ai/turn.ts` — Vercel Function for one model turn.
- `api/ai/evaluate.ts` — Vercel Function for model self-evaluation.
- `api/_lib/contracts.ts` — server-side request/response parsing.
- `api/_lib/urlPolicy.ts` — HTTPS, DNS, IP-range, and redirect policy.
- `api/_lib/upstream.ts` — bounded HTTPS JSON request helper.
- `api/_lib/providers/openaiCompatible.ts` — Chat Completions adapter.
- `api/_lib/providers/anthropic.ts` — Messages adapter.
- `api/_lib/providers/gemini.ts` — `generateContent` adapter.
- `api/_lib/providers/index.ts` — protocol dispatch and normalized result type.
- `tsconfig.api.json` — strict API-function type-check configuration.
- `tests/unit/ai-trials.test.ts`, `tests/unit/trial-reducer.test.ts`, `tests/unit/trial-db.test.ts`, `tests/unit/trial-client.test.ts`, `tests/unit/trial-checks.test.ts`.
- `tests/unit/api-url-policy.test.ts`, `tests/unit/api-providers.test.ts`, `tests/unit/api-handlers.test.ts`.
- `tests/e2e/ai-trial-flow.spec.ts`.

Modify:

- `index.html`, `scripts/verify-deploy.mjs`, `package.json`, and related deployment tests.
- `src/types/index.ts`, `src/schemas/index.ts`, `src/lib/storage/storage.ts`, `src/lib/settings/AppDataContext.tsx`.
- `src/app/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/features/lab/MessageLabPage.tsx`.
- `src/content/privacy.ts`, `src/features/settings/SettingsPage.tsx`, `README.md`.
- `vercel.json`, `tsconfig.node.json`, `tests/setup.ts`, existing routing/deploy/visual tests.

## Task 0: Baseline and Worktree Guard

**Files:** none.

- [ ] **Step 1: Record the starting state.**

Run:

```powershell
git status --short
npm run lint
npm test
npm run build
```

Expected: only the already-known user changes are present; lint, tests, and build pass. Do not revert those changes.

- [ ] **Step 2: Create a feature branch or isolated worktree before implementation.**

Use the repository's normal worktree workflow. Do not commit or alter the existing adult-content review changes in the same commit.

## Task 1: Add the Browser Icon

**Files:**
- Create: `public/favicon.svg`, `scripts/generate-favicon.mjs`
- Modify: `index.html`, `package.json`, `scripts/verify-deploy.mjs`, `tests/unit/deploy-config.test.ts`

- [ ] **Step 1: Add the SVG mark.** Use a square canvas, a teal rounded rectangle, and a white outlined chat bubble. Do not put Chinese text inside the 16 px mark. The SVG must be self-contained and use no external font or image.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#217a70"/>
  <path d="M45 39a10 10 0 0 1-10 10H20l-9 8V20A10 10 0 0 1 21 10h14a10 10 0 0 1 10 10v19Z" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Add the deterministic asset generator.** Install `sharp` as a dev dependency and make `scripts/generate-favicon.mjs` read `public/favicon.svg`, write 32 px `public/favicon.png`, 180 px `public/apple-touch-icon.png`, and a PNG-backed 32 px `public/favicon.ico`. The ICO directory entry must point to the PNG byte offset; do not shell out to a machine-specific executable.

Run:

```powershell
npm install --save-dev sharp
node scripts/generate-favicon.mjs
```

Expected: all four files exist and the PNG/ICO files have a non-zero size.

- [ ] **Step 3: Reference all formats in `index.html`.** Add the following inside `<head>` without removing the existing description or theme color:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
```

- [ ] **Step 4: Verify the assets in production output.** Extend `scripts/verify-deploy.mjs` to require the three browser-facing files in `dist/`. Add a unit assertion that `index.html` references `/favicon.svg` and `/favicon.ico`; validate the ICO magic bytes/directory entry and the Apple PNG's 180×180 IHDR rather than checking only for non-zero files.

- [ ] **Step 5: Run the focused checks.**

```powershell
npx vitest run tests/unit/deploy-config.test.ts
npm run build
node scripts/verify-deploy.mjs
```

Expected: PASS, and `dist/favicon.svg`, `dist/favicon.ico`, and `dist/apple-touch-icon.png` exist.

## Task 2: Define Trial Domain Types and Schemas

**Files:**
- Modify: `src/types/index.ts`, `src/schemas/index.ts`
- Create: `src/schemas/ai-trials.ts`, `tests/unit/ai-trials.test.ts`

- [ ] **Step 1: Write failing schema tests.** Cover exactly these invariants:

```ts
expect(trialDifficultySchema.safeParse('simple').success).toBe(true)
expect(trialDifficultySchema.safeParse('expert').success).toBe(false)
expect(trialRoundLimitSchema.safeParse(5).success).toBe(true)
expect(trialRoundLimitSchema.safeParse(4).success).toBe(false)
expect(trialRoundLimitSchema.safeParse(31).success).toBe(false)
expect(apiProtocolSchema.safeParse('openai-compatible').success).toBe(true)
expect(apiProtocolSchema.safeParse('unknown').success).toBe(false)
```

- [ ] **Step 2: Add the shared types.** Use distinct names so the existing scenario `Difficulty` type is unchanged:

```ts
export type TrialMode = 'communication' | 'promptcraft'
export type TrialDifficulty = 'simple' | 'normal' | 'hard'
export type ApiProtocol = 'openai-compatible' | 'anthropic' | 'gemini'
export type TrialRoundLimit = number

export type TrialHardCheck =
  | { type: 'nonEmpty' }
  | { type: 'jsonObject'; requiredKeys: string[] }
  | { type: 'containsAll'; values: string[]; caseSensitive: boolean }
  | { type: 'maxChars'; max: number }
  | { type: 'safeCommunication' }

export interface TrialMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface TrialChallenge {
  id: string
  reviewStatus: 'draft' | 'reviewed'
  mode: TrialMode
  difficulty: TrialDifficulty
  title: string
  brief: string
  objective: string
  initialPrompt: string
  testInput?: string
  acceptanceCriteria: string[]
  hardChecks: TrialHardCheck[]
}

export interface TrialSummary {
  id: string
  challengeId: string
  mode: TrialMode
  difficulty: TrialDifficulty
  protocol: ApiProtocol
  model: string
  roundLimit: number
  roundsUsed: number
  hardScore: number
  selfScore: number | null
  completedAt: string
}

export interface TrialSessionRecord extends TrialSummary {
  upstreamHost: string
  challengeSnapshot: Omit<TrialChallenge, 'reviewStatus'>
  messages: TrialMessage[]
  hardCheckResults: Array<{ type: TrialHardCheck['type']; passed: boolean; explanation: string }>
  evaluation: TrialEvaluation | null
}

export interface TrialEvaluation {
  score: number
  strengths: string[]
  weaknesses: string[]
  nextAction: string
  disclaimer: 'model-self-evaluation'
}
```

Keep `apiKey` out of every shared type that can reach persistence or JSX props. Enforce an integer from 5 through 30 with the Zod schema and reducer; do not rely on the broad TypeScript `number` alone.

- [ ] **Step 3: Add Zod schemas.** Validate every parameterized hard check, including non-empty/unique lists and bounded positive `max`. `trialSessionRecordSchema` must reject messages longer than 8,000 characters each, more than 60 messages, and a record whose serialized payload is larger than 2 MB. Persist only the normalized upstream hostname, never a custom path, credentials, query, or fragment.

- [ ] **Step 4: Run the focused test.**

```powershell
npx vitest run tests/unit/ai-trials.test.ts
```

Expected: PASS after the minimal types and schemas are added.

## Task 3: Draft and Review a Static Challenge Pool

**Files:**
- Create: `src/content/ai-trials-draft.ts`, `src/content/ai-trials.ts`, `src/lib/ai/selectChallenge.ts`
- Modify: `src/content/index.ts`, `tests/unit/ai-trials.test.ts`

- [ ] **Step 1: Draft 18 challenge candidates.** Put three `communication` and three `promptcraft` challenges for each difficulty in `ai-trials-draft.ts`. Use IDs such as `communication-simple-01` and `promptcraft-hard-03`. Keep all candidates at `reviewStatus: 'draft'`; a coding model must never promote its own content to `reviewed`. Production modules must not import this file.

- [ ] **Step 2: Stop for the human-review gate.** Review each candidate for adult suitability, consent and boundary handling, non-coercive wording, clear acceptance criteria, and absence of sexual technique or evasion instructions. Copy approved items into `ai-trials.ts` with `reviewStatus: 'reviewed'` only in a separate, human-approved change. Until then the implementation is BLOCKED for release, and the UI shows `暂无已审核题目`.

- [ ] **Step 3: Define the two workflows in content.**

Communication challenges: the model is a simulated conversation partner, the user practices one message at a time, and the rubric checks listening, clarity, pressure, and boundaries.

Promptcraft challenges: the user writes or revises a prompt against a fixed test input, and the rubric checks instruction following, structure, completeness, and resistance to irrelevant instructions. Do not execute tools or external actions.

- [ ] **Step 4: Implement injected-RNG selection.** `selectChallenge(mode, difficulty, previousIds, rng)` filters only reviewed challenges, avoids the previous three IDs when possible, and returns `undefined` for an empty pool. Never call `Math.random()` inside the function; the test supplies the RNG.

- [ ] **Step 5: Test selection and release boundaries.** Cover each mode/difficulty, no-repeat behavior, deterministic RNG, draft exclusion, and the empty reviewed-pool state. A release-gate test must require at least three reviewed items in all six mode/difficulty pools and prove that the production content graph never imports `ai-trials-draft.ts`.

```powershell
npx vitest run tests/unit/ai-trials.test.ts
```

## Task 4: Add the Trial Reducer and Round Limits

**Files:**
- Create: `src/lib/ai/trialReducer.ts`, `tests/unit/trial-reducer.test.ts`

- [ ] **Step 1: Define state and actions.** The reducer must own `phase: 'setup' | 'running' | 'evaluating' | 'complete' | 'error'`, `messages`, `roundLimit`, `roundsUsed`, `pendingRequestId`, `hardScore`, and `errorCode`.

- [ ] **Step 2: Enforce one round as one accepted exchange.** `SUBMIT` is ignored while `pendingRequestId` is set, ignored when `roundsUsed >= roundLimit`, and rejected when input is empty or above the per-message limit. `MODEL_RESPONSE` increments `roundsUsed` exactly once. A stale response whose request ID does not match is ignored.

- [ ] **Step 3: Write reducer tests before UI.** Required tests:

```ts
it('accepts exactly the selected number of rounds', ...)
it('blocks double submit while a request is pending', ...)
it('ignores a stale response', ...)
it('transitions to complete at the cap', ...)
it('allows explicit early finish', ...)
it('preserves an upstream error without incrementing rounds', ...)
```

Run:

```powershell
npx vitest run tests/unit/trial-reducer.test.ts
```

## Task 5: Persist Transcripts in IndexedDB

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/ai/trialDb.ts`, `tests/unit/trial-db.test.ts`
- Modify: `tests/setup.ts`

- [ ] **Step 1: Install the small IndexedDB wrapper and test shim.**

```powershell
npm install idb
npm install --save-dev fake-indexeddb
```

- [ ] **Step 2: Add test setup.** Import `fake-indexeddb/auto` in `tests/setup.ts` before tests use `indexedDB`. Clear the `huiliao-ai-trials` database in `afterEach`.

- [ ] **Step 3: Implement the database.** Use database version `1`, object store `sessions` with key path `id`, and indexes on `completedAt` and `mode`. Store only `TrialSessionRecord`; never accept or serialize a field named `apiKey`.

- [ ] **Step 4: Implement quota cleanup.** On save, sort newest first, keep at most 20 records, calculate UTF-8 byte size with `Blob`, and remove the oldest records until the total is at or below 25 MB. If one record alone exceeds 2 MB, reject it and show a recoverable UI error.

- [ ] **Step 5: Add operations and eviction reporting.** Export `saveTrialSession`, `listTrialSessions`, `getTrialSession`, `deleteTrialSession`, `clearTrialSessions`, and `exportTrialSession`. `saveTrialSession` returns every `evictedId`; the completion flow removes matching localStorage summaries. Export one session as a downloaded JSON file; do not merge transcripts into the existing all-app export by default.

- [ ] **Step 6: Test persistence and cleanup.** Assert that a sentinel API key and custom Base URL path never appear in a stored record or export, old records and summaries are removed together at 20/25 MB, and delete/clear/export work. Close every open `idb` connection before deleting the test database.

```powershell
npx vitest run tests/unit/trial-db.test.ts
```

## Task 6: Add Trial Summaries to Versioned App Data

**Files:**
- Modify: `src/types/index.ts`, `src/schemas/index.ts`, `src/lib/storage/storage.ts`, `src/lib/settings/AppDataContext.tsx`
- Modify: `tests/unit/storage.test.ts`, `tests/unit/app-routing.test.tsx`

- [ ] **Step 1: Add `trialSummaries` as an optional migration field.** Existing users must load without a recovery screen. Do not call the current schema parser on a raw record before checking its numeric `schemaVersion`; that is the existing migration bug.

- [ ] **Step 2: Move to schema version 2.** Keep the storage key `huiliao:v1` for compatibility, but set `SCHEMA_VERSION = 2`. Parse a minimal raw envelope first, migrate version 1 to version 2 with `trialSummaries: []`, then validate the current schema. Update every hardcoded `schemaVersion: 1` in `AppDataContext.tsx` to use `SCHEMA_VERSION`.

- [ ] **Step 3: Add summary operations and recovery.** Implement `addTrialSummary`, `removeTrialSummary`, `clearTrialSummaries`, and `reconcileTrialSummaries`. Save the IndexedDB record first, then apply `evictedIds` and add the new localStorage summary. If the second write fails, keep the transcript, show `对话已保存，但历史索引更新失败`, and rebuild summaries from IndexedDB on the next AI-history load. Single-session deletion follows the same record-first order. Keep at most 20 summaries and never store the transcript, API key, upstream host, or Base URL in this envelope.

- [ ] **Step 4: Integrate every recovery/clear action.** The Settings page's existing `清除全部数据` and the corrupt-storage recovery page's `清除并重新开始` must await `clearTrialSessions()` as well as resetting the localStorage envelope. Keep the destructive confirmation visible until both stores finish; show an error instead of claiming success if IndexedDB cleanup fails.

- [ ] **Step 5: Add migration tests.** Specify the new rule before changing code: migrate only schema version 1; future or unknown versions such as `999` go to raw-backup recovery and are not guessed into the current schema. Update the existing conflicting fixture deliberately. Cover malformed JSON recovery, summary round-trip, reconciliation, and clear-all behavior across localStorage and IndexedDB.

```powershell
npx vitest run tests/unit/storage.test.ts tests/unit/app-routing.test.tsx
```

## Task 7: Define the Same-Origin API Contract

**Files:**
- Create: `src/schemas/ai-trials.ts`, `api/_lib/contracts.ts`
- Create: `tests/unit/api-handlers.test.ts`

- [ ] **Step 1: Define the browser request.** Public JSON contains `mode`, `difficulty`, `challengeId`, `protocol`, `target`, `model`, `roundLimit`, `roundsUsed`, and normalized `messages`. `target` is either a server-known `presetId` or `{ kind: 'custom', baseUrl }`; preset requests never accept a caller-supplied URL. The JSON schema contains no `apiKey` field.

- [ ] **Step 2: Define the sensitive header.** Send the credential once as `X-Huiliao-Api-Key`. Reject missing, repeated, control-character, or over-4-KB values, then reconstruct only the selected provider's upstream auth header. Do not reuse browser `Authorization`, which may be occupied by Vercel Preview Protection. Verify in both `vercel dev` and one protected preview that the custom header reaches the Function without being logged by application code.

- [ ] **Step 3: Define the normalized response.** Both providers and handlers return:

```ts
type NormalizedResponse = {
  text: string
  finishReason: 'stop' | 'length' | 'blocked' | 'unknown'
  usage: { inputTokens: number | null; outputTokens: number | null }
}
```

- [ ] **Step 4: Add strict limits.** Reject request bodies above 256 KB, user messages above 8,000 characters, total transcript above 120,000 characters, round limits outside 5–30, and more than two messages per completed round plus one pending user message.

- [ ] **Step 5: Map provider failures.** Return JSON error codes only: `INVALID_REQUEST`, `UNSUPPORTED_PROTOCOL`, `INVALID_UPSTREAM_URL`, `UPSTREAM_AUTH`, `UPSTREAM_RATE_LIMIT`, `UPSTREAM_TIMEOUT`, `UPSTREAM_BAD_RESPONSE`, `UPSTREAM_SECRET_ECHO`, and `UPSTREAM_UNAVAILABLE`. Never forward raw upstream bodies or request headers.

## Task 8: Implement the Public HTTPS URL Policy

**Files:**
- Create: `api/_lib/urlPolicy.ts`, `api/_lib/upstream.ts`, `tests/unit/api-url-policy.test.ts`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Write the table-driven failing tests.** Cover URL syntax, address classes, DNS result sets, recursive self-targeting, redirect handling, deadline, response limit, and a mocked public HTTPS request. Confirm each case fails for the intended reason before implementing the policy. No test may call the live internet.

- [ ] **Step 2: Validate the URL.** Parse with the WHATWG `URL` class and require a canonical HTTPS hostname or IP literal. Reject username, password, query, hash, empty/single-label host, trailing-dot ambiguity, IPv6 zone IDs, encoded slash/backslash/NUL/traversal in the path, `localhost`, `.local`, and unsupported URL length. Preserve a path prefix so a gateway such as `https://proxy.example.com/v1` works. Accept an explicit HTTPS port for user-managed proxies; document that arbitrary public ports require WAF/rate limits because they add a port-scanning surface.

- [ ] **Step 3: Resolve and classify addresses.** Add `ipaddr.js`. Resolve A and AAAA with `dns.promises.lookup(..., { all: true })`; require 1–8 unique results and reject the whole set if any address is not public unicast. Normalize IPv4-mapped IPv6 before classification. Explicitly reject loopback, private, link-local, multicast, unspecified, documentation-only, carrier-grade NAT, metadata, NAT64, 6to4, and Teredo ranges. Treat DNS failure, an empty set, or an oversized set as invalid.

- [ ] **Step 4: Reject self-recursion.** Reject a target hostname matching the current request Host, `VERCEL_URL`, or `VERCEL_PROJECT_PRODUCTION_URL`, including their normalized forms. This check supplements IP classification and prevents calling the deployment's own public API recursively.

- [ ] **Step 5: Pin the validated public address.** Use `https.request` with the original hostname, a custom `lookup` that returns the chosen validated IP, original-host TLS SNI/certificate verification, and `agent: false`. Do not retry, follow redirects, fall back to normal DNS, or reuse a socket for a different target.

- [ ] **Step 6: Disable redirects and generic forwarding.** Follow no `Location` header. Construct the final path only in the provider adapter. Allow only `POST`, `Content-Type`, the protocol-specific API key header, and the adapter's required version header.

- [ ] **Step 7: Bound and verify the upstream request.** Apply one 25-second deadline across DNS, TCP, TLS, upload, headers, and body; cap serialized request and response bytes at 1 MB; precheck `Content-Length` but enforce the cap on streamed chunks; request identity encoding only and reject unexpected `Content-Encoding`; destroy the socket on timeout, cap breach, client abort, or handler cancellation; return sanitized errors; and never log URL, headers, body, API key, prompt, or response text. Run the focused suite and confirm all tests pass.

## Task 9: Implement Provider Adapters

**Files:**
- Create: `api/_lib/providers/openaiCompatible.ts`, `api/_lib/providers/anthropic.ts`, `api/_lib/providers/gemini.ts`, `api/_lib/providers/index.ts`
- Create: `tests/unit/api-providers.test.ts`

- [ ] **Step 1: Write failing adapter fixtures.** For each protocol, assert request path, role mapping, auth header, fixed output budget, normalized success, auth/rate-limit/blocked/malformed responses, and absence of tools, streaming, key query parameters, and caller-controlled system prompts.

- [ ] **Step 2: OpenAI-compatible adapter.** Map preset ID `openai` server-side to `https://api.openai.com/v1`. Append `/chat/completions`, send `Authorization: Bearer <key>`, and map `choices[0].message.content`, `finish_reason`, and `usage`. Use `max_completion_tokens: 1200` for the official OpenAI preset and `max_tokens: 1200` for custom OpenAI-compatible targets; keep separate request fixtures because compatibility gateways differ here. Reject missing or non-string text. Do not enable tools, streaming, response persistence, or arbitrary request fields.

- [ ] **Step 3: Anthropic adapter.** Map preset ID `anthropic` to `https://api.anthropic.com/v1`. Append `/messages`, send `x-api-key`, `anthropic-version: 2023-06-01`, `Content-Type`, and required `max_tokens: 1200`; move the server-owned system instruction to the top-level `system` field; then map the first text block, stop reason, and usage.

- [ ] **Step 4: Gemini adapter.** Map preset ID `gemini` to `https://generativelanguage.googleapis.com/v1beta`. Validate the model ID against `^[A-Za-z0-9._:/-]{1,128}$`, append `/models/{encodedModel}:generateContent`, send `x-goog-api-key`, set `generationConfig.maxOutputTokens: 1200`, map normalized history into `contents[].parts[].text`, and read the first candidate and usage metadata. Do not put the key in a query string.

- [ ] **Step 5: Own prompt assembly on the server.** Select a fixed, versioned system prompt from reviewed `challengeId` and mode. Communication and Promptcraft use separate templates. The browser may send user/assistant messages but never a system message, rubric, adapter path, headers, output budget, or executable tool definition.

- [ ] **Step 6: Normalize and check the response.** Decode UTF-8 strictly, parse JSON once under the byte cap, and validate an exact provider-specific Zod schema. Reject malformed shapes, non-finite/negative usage, empty or oversized text, and unexpected encodings as `UPSTREAM_BAD_RESPONSE`. Map finish reasons to `stop`, `length`, `blocked`, or `unknown`. Before returning text, compare it against the complete request credential; if it contains the credential, discard it and return `UPSTREAM_SECRET_ECHO`. Render accepted model text only as React text, never HTML.

- [ ] **Step 7: Use a smaller evaluation budget.** Set self-evaluation output to at most 800 tokens for every provider. Run all adapter fixtures and confirm the request and response invariants pass.

Official wire-format references to keep in the code comments and review notes: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat), [Anthropic Messages](https://docs.anthropic.com/en/api/messages), and [Gemini `generateContent`](https://ai.google.dev/api/generate-content). For routing and function placement, use [Vercel Functions](https://vercel.com/docs/functions) and [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Task 10: Add Vercel Function Handlers

**Files:**
- Create: `api/ai/turn.ts`, `api/ai/evaluate.ts`, `tsconfig.api.json`
- Modify: `package.json`, `vercel.json`, `scripts/verify-deploy.mjs`, `tests/unit/deploy-config.test.ts`

- [ ] **Step 1: Add API type checking and runtime pinning.** Create `tsconfig.api.json` with strict settings, Node 22 types, DOM `Request`/`Response` types, `api/**/*.ts`, and shared `src/types`/`src/schemas` includes. Add `"typecheck:api": "tsc -p tsconfig.api.json --noEmit"`, set `engines.node` to `22.x`, select the Vercel Node runtime rather than Edge, and run the type check from `verify:deploy` before the Vite build.

- [ ] **Step 2: Implement `POST /api/ai/turn`.** Parse JSON and the dedicated credential header, validate the challenge ID against reviewed static content, load the server-owned prompt/rubric, run server-side safety/length checks, resolve the preset/custom target, invoke the selected adapter, and return the normalized response. Reject all methods except POST and return `405` with `Allow: POST`.

- [ ] **Step 3: Implement `POST /api/ai/evaluate`.** Accept only the completed transcript, `challengeId`, target, protocol, model, and declared round values plus the dedicated credential header. Reload the reviewed rubric on the server and recompute deterministic checks; never trust a client rubric, system prompt, or score. Ask the same model for the fixed JSON shape. Return `selfScore: null` for invalid JSON, missing fields, or any score outside 0–100; do not clamp an invalid score into validity. Cap each accepted explanation at 500 characters.

- [ ] **Step 4: Add headers and request controls.** Every successful/error response must set `Content-Type: application/json`, `Cache-Control: no-store`, and a conservative `Vary: Origin`. For POST, require an exact allowlist match against the local/deployed app origins; reject missing, `null`, sibling, subdomain, and prefix-confusion Origins. Do not emit CORS grants, and optionally reject `Sec-Fetch-Site` values other than `same-origin`. Check method before Origin so a diagnostic `GET` still returns JSON `405`. Treat same-origin as a browser control, not authentication; require Vercel WAF/rate limiting for public abuse. Never write request or response text to logs.

- [ ] **Step 5: Configure functions without breaking SPA fallback.** Add a scoped `functions` entry for `api/ai/**/*.ts` with a bounded `maxDuration` that exceeds the 25-second internal deadline by only a small margin and is valid for the selected Vercel plan. Confirm the existing catch-all rewrite remains after filesystem function resolution. Vercel's documented `api/` directory convention is the source of truth.

- [ ] **Step 6: Add deployment tests.** Assert `vercel.json` contains the function glob, keeps `connect-src 'self'`, preserves the SPA rewrite, and does not add an external browser `connect-src` host list.

## Task 11: Build the Browser API Client and Connection Form

**Files:**
- Create: `src/lib/ai/trialClient.ts`, `src/features/lab/AiTrialPage.tsx`, `src/features/lab/LabTabs.tsx`, `src/features/lab/aiTrial.css`
- Modify: `src/app/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/features/lab/MessageLabPage.tsx`
- Create: `tests/unit/trial-client.test.ts`, `tests/unit/ai-trial-page.test.tsx`

- [ ] **Step 1: Add the `/lab/ai` route.** Keep `/lab` behavior unchanged so existing tests continue to find `消息实验室`. Add a `LabTabs` link to `/lab/ai`; add page context `AI 试炼场` in `AppLayout`.

- [ ] **Step 2: Implement setup fields.** Required controls: mode segmented control, difficulty segmented control, random challenge button, protocol select, target select (`官方预设` / `自定义地址`), model ID input, password API-key input, round-limit range/number control from 5 to 30, and an explicit checkbox acknowledging that trial text is sent through the app's same-origin relay. For a preset, display the server-known hostname as read-only and send only `presetId`; reveal an editable Base URL only for `自定义地址`. State that model self-evaluation makes one additional request and consumes the user's provider tokens or balance.

- [ ] **Step 3: Keep credentials in memory only.** Store the key in component/reducer state. On route unmount, reset, refresh, or `beforeunload`, clear it. When protocol, preset, or normalized custom hostname changes, immediately clear the old key and consent, then require confirmation of the new hostname. Never put the key in URL, JSON body, React error text, analytics, localStorage, IndexedDB, or `console` calls.

- [ ] **Step 4: Add connection test.** Use a minimal non-sensitive request with the chosen challenge only after consent. Show `连接中`, `连接成功`, `认证失败`, `地址不可用`, `超时`, and `响应格式不兼容`; do not show raw provider error bodies.

- [ ] **Step 5: Write component tests.** Assert required fields, key masking, consent gating, round slider boundaries, route navigation, target-change key clearing, and normalized-host confirmation. Assert the key appears only in the dedicated mocked request header, never in JSON, rendered DOM, localStorage, IndexedDB, or exported data. Map non-JSON Vercel platform responses, such as 413 or timeout HTML, to a generic local error without rendering the response body.

## Task 12: Implement the Two Trial Workflows

**Files:**
- Modify: `src/features/lab/AiTrialPage.tsx`, `src/lib/ai/trialReducer.ts`, `src/lib/ai/trialClient.ts`
- Modify: `tests/unit/ai-trial-page.test.tsx`

- [ ] **Step 1: Communication trial.** Render the challenge brief, simulated counterpart messages, user composer, current round count, stop/finish button, and a clear safety warning. Run `safetyCheck()` before sending user text; a blocked input remains local and does not reach `/api/ai/turn`.

- [ ] **Step 2: Promptcraft trial.** Render fixed test input, acceptance criteria, prompt editor, output panel, hard-check results, and `重新提交提示词`. Each prompt run consumes one round; do not execute tools, browse, send emails, or act on external systems.

- [ ] **Step 3: Handle loading and cancellation.** Disable duplicate submission, attach an `AbortController`, allow cancellation, and leave the reducer in a retryable state when a request is aborted. Do not increment `roundsUsed` for a failed or cancelled request.

- [ ] **Step 4: End and evaluate.** The user can finish early or the cap auto-finishes. Run deterministic checks first, then call `/api/ai/evaluate` once. This is a separate, billable provider request and must never run without the setup disclosure. If evaluation fails, show hard-check results and a non-blocking “模型自评不可用” state.

- [ ] **Step 5: Save after completion.** Save a complete `TrialSessionRecord` with challenge snapshot, all prompt revisions/messages and outputs, deterministic results, parsed evaluation, protocol/model, and normalized upstream hostname. Never save raw evaluation text, a custom Base URL path, credential, or pending request. Apply `evictedIds` before adding the redacted `TrialSummary`.

## Task 13: Implement Deterministic Checks and Self-Evaluation Display

**Files:**
- Create: `src/lib/ai/trialChecks.ts`, `tests/unit/trial-checks.test.ts`
- Modify: `src/features/lab/AiTrialPage.tsx`, `src/types/index.ts`, `src/schemas/ai-trials.ts`

- [ ] **Step 1: Implement the fixed check set.** `nonEmpty`, `maxChars`, `jsonObject`, `containsAll`, and `safeCommunication` must return `{ id, passed, explanation }`. A check cannot award points for an unvalidated claim.

- [ ] **Step 2: Calculate hard score.** `hardScore = passedChecks / totalChecks * 100`, rounded to an integer. If there are no checks, return 0 and show “本题没有可验证的硬规则”.

- [ ] **Step 3: Render separate result sections.** Use headings `硬规则检查` and `模型自评`. Always show the disclaimer `模型自评，仅供比较，不是客观基准`. Do not display a single blended score that hides the distinction.

- [ ] **Step 4: Add malformed-evaluation tests.** Invalid JSON, any out-of-range score, missing fields, overlong feedback, and prompt-injected evaluation text must produce a null self-score. Never clamp an invalid value into a valid score.

## Task 14: Add History, Privacy, and Settings Copy

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`, `src/content/privacy.ts`, `README.md`, `src/features/lab/AiTrialPage.tsx`
- Modify: `tests/unit/settings-page.test.tsx`, `tests/unit/privacy-page.test.tsx`

- [ ] **Step 1: Add the disclosure before the first request.** State in plain Chinese: the input and model output are sent through this app's same-origin relay to the user's configured Base URL; the provider and relay may process network requests under their own policies; the API key exists in page memory and passes transiently through the relay, so browser extensions, developer tools, and the relay environment can potentially observe it even though the app does not persist it; model self-evaluation adds one provider request; complete transcripts are stored only in this browser's IndexedDB after the user starts a trial.

- [ ] **Step 2: Update the old absolute privacy claims.** Replace “训练输入不上传” wherever it would incorrectly include AI Trial Lab. Keep the existing local-only promise for Message Lab and scenario free input.

- [ ] **Step 3: Add history controls.** Show newest-first trial summaries, open a stored transcript, export one session, delete one session, and clear all trial history. Show current quota policy: “最近 20 次或 25 MB，达到上限自动清理最旧记录”. The trial-history clear action removes both IndexedDB records and localStorage summaries. The Settings page's global clear action must do the same.

- [ ] **Step 4: Test privacy boundaries.** Assert API keys, complete transcripts, and all custom Base URL path/query secrets do not appear in the existing app JSON export. Feed a sentinel key through a malicious mocked upstream response and assert the response is discarded before persistence. Assert the explicit AI consent copy exists and the old promise is not misleading.

## Task 15: Add E2E and Deployment Verification

**Files:**
- Create: `tests/e2e/ai-trial-flow.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`, `tests/unit/deploy-config.test.ts`, `scripts/verify-deploy.mjs`

- [ ] **Step 1: Mock the API in Playwright.** Intercept `/api/ai/turn` and `/api/ai/evaluate`; never call a live provider. Cover setup, consent, random challenge, one successful turn, cancellation, 5-round cap, 30-round cap, malformed self-evaluation, history save, reload, export, and delete.

- [ ] **Step 2: Check all viewports.** Add `/lab/ai` to visual coverage for 1440×900, 768×1024, and 360×800. Assert no horizontal overflow, no resource 404, no console errors, and that the bottom nav does not cover the composer or finish button.

- [ ] **Step 3: Check browser assets and API routes.** In a local Vercel preview or deployment, verify:

```powershell
npx vercel dev
```

In a second terminal, run:

```powershell
curl.exe -I http://localhost:3000/favicon.ico
curl.exe -I http://localhost:3000/favicon.svg
curl.exe -i http://localhost:3000/api/ai/turn
```

Expected: favicon assets return 200; `GET /api/ai/turn` returns 405 JSON; no `/api/ai/*` request returns `index.html`.

- [ ] **Step 4: Run the complete verification.**

```powershell
npm run lint
npm test
npm run build
npm run verify:deploy
npx playwright test tests/e2e/ai-trial-flow.spec.ts tests/e2e/visual.spec.ts tests/e2e/mobile.spec.ts
```

Expected: all commands pass. If Playwright is unavailable, report it as blocked and do not claim full E2E success.

## Security and Release Gates

- Do not accept `http://`, `file://`, `data:`, `javascript:`, credentials in URL, query-string keys, redirects, or arbitrary HTTP methods.
- Do not allow tool calls, file uploads, image/audio inputs, external browsing, or action execution in the Trial Lab.
- Do not put provider secrets in `VITE_*`, the bundle, `localStorage`, IndexedDB, URL, logs, screenshots, error reports, or exported JSON.
- Do not weaken `connect-src 'self'`; the browser talks only to same-origin `/api/ai/*`.
- Do not add a generic proxy endpoint that forwards caller-selected paths or headers.
- Arbitrary public HTTPS ports enable limited public-host port scanning even after private-range blocking. Production remains blocked until Vercel WAF/rate limiting is active for `/api/ai/*` and the preview test proves the total deadline and request cap.
- Same-origin checks are not authentication: require exact Origin validation for browser POSTs, no CORS grant, and a Vercel WAF/rate-limit rule before production.
- Do not alter `reviewStatus` in existing scenario content or import `scenarios-draft.ts` into production content.
- Do not ship with an empty reviewed AI pool: all six mode/difficulty combinations need at least three separately approved challenges.
- Do not disable TLS verification, override hostname identity, retry a chargeable POST, reuse a shared keep-alive socket, or fall back to an unpinned DNS lookup.
- Before Production, configure a Vercel-level rate limit/WAF rule for `/api/ai/*`; code-level body and timeout limits are not a substitute for platform rate limiting.
- Update README and `/privacy` before enabling the feature in Production. The feature is not “private” merely because the transcript is stored in IndexedDB; it is still sent to the configured provider.

## Final Handoff

After the final verification, report:

- favicon asset paths and HTTP status;
- AI routes and provider protocols implemented;
- exact input/output/round limits;
- IndexedDB quota behavior and whether any transcript was exported;
- test commands and results;
- any blocked Playwright, Vercel, provider, or security checks.
