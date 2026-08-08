# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci                  # Install dependencies (Node 22.x required)
npm run dev             # Vite dev server → http://localhost:5173
npm run build           # tsc -b && vite build → dist/
npm run preview         # Preview production build locally
npm test                # All Vitest unit tests (540 tests / 26 files, 2026-08-08 实测)
npm run test:watch      # Vitest watch mode
npm run lint            # ESLint (TypeScript + React hooks)
npm run typecheck:api   # tsc against api/ only (separate project, not in tsc -b)
npm run e2e             # Playwright E2E (auto-starts dev server; reuseExistingServer)
npm run verify:deploy   # lint → test → build → typecheck:api → verify-deploy.mjs
```

### Running a single test

```bash
npx vitest run tests/unit/safety.test.ts                    # One file
npx vitest run -t "should detect impaired consent"           # By test name
npx playwright test tests/e2e/onboarding-flow.spec.ts        # One E2E file
npx playwright install chromium                              # If browsers missing
```

If Playwright cannot run, report it as `BLOCKED` and follow `docs/TESTING_WITHOUT_PLAYWRIGHT.md`. Do not claim E2E success.

### `typecheck:api` 状态（2026-08-08 实测）

**PASS**（exit 0）。之前的 SSRF 加固重构（`urlPolicy.ts` 的 `resolveAndPin`/`PinnedTarget`）已在 `dfc0cc8` 完成并通过，`api/` 下无 `any`/类型强转。安全不变量全部有测试覆盖：HTTPS-only、DNS 全地址公网 unicast 校验、IP 钉定（`upstream.ts` 连接钉定地址不重解析）、自递归拒绝（`selfHosts`）、禁止重定向、25 秒截止、1 MB 请求/响应上限、密钥回显拒绝（`UPSTREAM_SECRET_ECHO`）、错误响应只含 error code。修改 `api/` 时必须保持这些不变量，并同步 `tests/unit/api-{url-policy,upstream,providers,handlers}.test.ts`。

`verify:deploy` 链（lint → test → build → typecheck:api → verify-deploy.mjs）是 Vercel 的 `buildCommand`，任何一步失败都会阻断部署；不要删减链上的步骤。

## Architecture

**会聊 (Huìliáo)** — a local-first SPA for adults practicing respectful relationship communication. No accounts, no database, no cloud sync. Two distinct halves:

1. **Static SPA** (`src/`) — scenario practice, message analysis, all progress. Fully offline, localStorage only.
2. **AI trial** (`api/` + `src/lib/ai/`) — optional feature where the user supplies their own model API key. Vercel Node Functions relay one request at a time; nothing is stored server-side.

Do not blur that line. The static half must keep working with the functions unreachable.

### Tech stack

React 18 · TypeScript (strict) · Vite 5 · React Router 6 · Zod · `idb` (IndexedDB) · `ipaddr.js` (server-side IP range classification) · Vitest + React Testing Library · Playwright · vanilla CSS with design tokens

### Three TypeScript projects

- `tsconfig.app.json` — `src/` (DOM libs, `@/` + `@tests/` paths)
- `tsconfig.node.json` — Vite/tooling config
- `tsconfig.api.json` — `api/` only, Node types, **not referenced by `tsconfig.json`**, so `tsc -b` and `npm run build` never check it. Only `typecheck:api` does.

Path aliases `@/` → `src/` and `@tests/` → `tests/` are declared in both `tsconfig.app.json` and `vite.config.ts`. Both must stay in sync.

### Layer architecture (bottom-up)

1. **`src/types/index.ts`** — every domain interface and union type, including the trial types (`TrialChallenge`, `TrialSummary`, `TrialSessionRecord`, `TrialEvaluation`, `ApiProtocol`). Single source of truth.

2. **`src/schemas/`** — Zod mirrors of those types. `index.ts` covers content + stored data; `ai-trials.ts` covers trials. Content modules call `.parse()` at import time, so malformed data fails fast at startup rather than at render.

3. **`src/content/`** — static content. Reviewed scenarios live in `scenarios-a.ts`…`scenarios-d.ts` (3 each, 12 total) and aggregate through `content/index.ts`, which also runs `validateScenarioCorpus()` at import and **throws** on graph violations. Draft content is quarantined in separate modules (`scenarios-draft.ts`, `ai-trials-draft.ts`) that no production entry point imports — only tests do. See "Content review lifecycle" below.

4. **`src/lib/safety/`** — two-stage classifier. `normalize.ts` (fullwidth→halfwidth, punctuation, whitespace) then `safety.ts`, priority-ordered: hard blocks (minor, impaired consent, refusal override, privacy violation, coercion, manipulation, deception, harassment, power imbalance) vs. cautions (warn only). Educational-discussion detection lets meta-questions through without execution intent.

5. **`src/lib/analysis/analyze.ts`** — `analyzeMessage(context, text)`: pure, scores a draft across 5 dimensions (清晰/真诚/倾听/分寸/边界), detects concerns, returns rewrite principles and tone-varied examples. Safety-checked first; blocked input returns zero scores and no rewrite advice.

6. **`src/lib/scenario/validate.ts`** — import-time graph validation: reachability from start, dead ends, cycles (forbidden except UI-level retry), boundary notes required on risky choices, and path-level safety (risky paths must not reach mutual endings).

7. **`src/lib/storage/storage.ts`** — localStorage wrapper. Corrupt data enters recovery mode (offers a raw backup download, never silently overwrites). See "Storage versioning" below.

8. **`src/lib/ai/`** — the trial vertical slice, all pure/testable in isolation:
   - `selectChallenge.ts` — picks from reviewed pool by mode+difficulty, avoids the last 3 played, takes an injected `rng` rather than calling `Math.random`
   - `trialReducer.ts` — the state machine (`setup → running → evaluating → complete`/`error`). Guards live here: single in-flight request via `pendingRequestId`, stale responses ignored on ID mismatch, failures do **not** consume a round, auto-advance to `evaluating` at the round cap.
   - `trialChecks.ts` — deterministic local scoring (`nonEmpty`, `maxChars`, `jsonObject`, `containsAll`, `safeCommunication`) → `calculateHardScore()` as pass-ratio × 100. Runs client-side; independent of any model verdict.
   - `trialDb.ts` — IndexedDB (`huiliao-ai-trials` / `sessions`) for full transcripts, with eviction at 20 sessions / 25 MB total / 2 MB per record
   - `trialClient.ts` — `fetch` wrappers for `/api/ai/turn` and `/api/ai/evaluate`

9. **`src/lib/settings/AppDataContext.tsx`** — context over all app state (settings, progress, favorites, reflections, trial summaries), exposing `useAppData()`. Also owns `reducedMotion` class toggling and corrupt-storage recovery state.

10. **`src/components/`** / **`src/features/`** — shared UI (`AppLayout`, `Modal`, `ConsentSignals`, `SkillBars`) and page components. `features/lab/` holds both `MessageLabPage` and `AiTrialPage`, tabbed via `LabTabs`.

### Storage versioning (note the mismatch)

`SCHEMA_VERSION` is **2**, but `STORAGE_NAMESPACE` is still the literal `'huiliao:v1'`. The key is not versioned; the payload is. Reading dispatches on the `schemaVersion` field inside the JSON, so v1→v2 migration (which backfills `trialSummaries: []`) happens in place under the same key. Don't "fix" the namespace string to `v1`→`v2` — that silently orphans every existing user's data.

Trial history is deliberately split across two stores: full transcripts in IndexedDB, lightweight summaries in localStorage. They can drift (IndexedDB cleared independently, or a session evicted by quota), so storage exposes a reconciliation path that filters summaries down to IDs still present in the DB. Keep both sides in mind when touching either.

### AI trial request path and its security invariants

Browser (`trialClient`) → `POST /api/ai/turn` with the key in the `X-Huiliao-Api-Key` header → `api/ai/turn.ts` validates with Zod → resolves the upstream target → `api/_lib/providers/` adapts to one of three protocols (`openai-compatible`, `anthropic`, `gemini`) → normalized `{text, finishReason, usage}` back.

Invariants to preserve when editing anything under `api/` or `src/lib/ai/`:

- **The key is never persisted.** It lives in React state (plus a ref for async reads) and travels in a header. Never write it to localStorage, IndexedDB, a query string, a log, or a trial record.
- **The system prompt is built server-side** (`buildSystemPrompt`) and is not client-supplied.
- **`api/_lib/urlPolicy.ts` is SSRF defense** for user-supplied custom base URLs, in three ordered stages: `validateBaseUrlSyntax` (HTTPS only, ≤2048 chars, no credentials/query/fragment, no whitespace or control chars, no single-label hosts, no IPv6 zone id, no trailing dot, no traversal or encoded-separator paths, and `localhost` / `*.local` / `*.internal` / `*.home.arpa` rejected by name) → `classifyAddress` → `resolveAndPin`. Widening any stage needs a security rationale.
- **It is an allowlist, not a blocklist.** `classifyAddress` accepts only `ipaddr.js` range `unicast`, normalizing IPv4-mapped IPv6 (`::ffff:127.0.0.1`) first so loopback can't be laundered past the check. Loopback, RFC 1918, link-local (including the cloud metadata IP), CGNAT, multicast, reserved, ULA, Teredo, 6to4, and NAT64 all fall out of that single rule rather than being enumerated.
- **DNS is resolved once and pinned.** `resolveAndPin` looks up every A/AAAA record (cap 8), rejects the whole host if *any* address is non-public, then pins one address; `upstream.ts` connects to that pinned address, so there is no second lookup to rebind. Self-recursion (a base URL pointing back at this deployment) is rejected separately via `deps.selfHosts`. Path prefixes are carried through `joinPath`, since `new URL('/chat/completions', 'https://host/v1')` would silently drop `/v1`.
- **Arbitrary HTTPS ports are deliberately allowed** so users can point at a self-managed proxy. That leaves a limited public port-probing surface, so production must keep Vercel WAF / rate limiting in front of `/api/ai/*` — the module header says so explicitly.
- **`api/_lib/upstream.ts` bounds every call**: 25 s deadline, 1 MB cap, redirects rejected, no socket reuse, connects to the `PinnedTarget` rather than re-resolving, upstream status mapped to a fixed `ApiErrorCode` set.
- **Responses are scanned for key echo** and rejected as `UPSTREAM_SECRET_ECHO`.
- **CSP pins `connect-src 'self'`.** The browser therefore cannot call a custom provider directly — the function is the only egress. Any design that fetches a model endpoint from the client contradicts the deployed headers.

Two traps in `urlPolicy.ts` itself:

- **It contains literal control bytes, not escapes** — a raw NUL inside the `UNSAFE_PATH` character class and a raw NUL–`0x1f` range in the control-character guard. Git therefore classifies the file as binary (`git diff` shows no hunks) and `grep`/`rg` skip it entirely, so a content search for its own exports silently returns nothing. Any editor or formatter that normalizes input will eat those bytes and weaken both checks with no visible diff. Rewriting them as `\x00` and `\x00-\x1f` escapes is behavior-preserving and removes the hazard.
- **It has no tests.** Nothing under `tests/` references `urlPolicy`, `resolveAndPin`, or `classifyAddress`, even though `ResolveDeps.lookup` exists precisely so the DNS stage can be tested without touching the network. It is the least-covered security-critical module in the repo; cover the pinning and whole-host-rejection paths with any change here.

The reviewed trial pool (`AI_TRIALS_REVIEWED`) is currently **empty**: all 18 candidate challenges sit in `ai-trials-draft.ts` awaiting professional review, so the UI shows an empty-pool state. That is intended, not a bug to route around.

### Routing & auth gate

In `src/app/App.tsx`. Corrupt storage short-circuits to `StorageRecoveryPage` before any routing. `/onboarding` is ungated and sets `isAdultConfirmed` + `onboardingCompleted`; every other route sits behind `<RequireOnboarding>`, which redirects unless **both** flags are true. Routes: `/`, `/practice`, `/practice/:id`, `/lab`, `/lab/ai`, `/progress`, `/settings`, `/privacy`, with `*` → `/`.

### CSS system

`src/styles/tokens.css` holds design tokens — off-white `--bg: #fcf9f8`, dark `--ink: #1c1b1b`, sage `--primary: #3c683b`, brick `--warning: #ba1a1a`. Type is a three-family stack: `--font-display` (Hanken Grotesk) for page titles, `--font-sans` (Be Vietnam Pro) for body, `--font-label` (Work Sans) for small uppercase labels — each falling back to PingFang SC for CJK, since the Latin faces are subset to Latin only. `src/styles/fonts.css` imports those self-hosted faces from `@fontsource*` packages (CSP is `font-src 'self'`, so remote font CDNs are blocked). `src/styles/global.css` has the layout system, utilities (`.card`, `.btn`, `.row`, `.mt-*`), the `.page-with-aside` main+aside grid, and the sidebar → bottom-nav breakpoints. Trial-specific styles are scoped in `features/lab/aiTrial.css`.

### Content review lifecycle

Scenarios, privacy topics, and trial challenges carry `reviewStatus: 'draft' | 'reviewed'`. Production getters (`getPublishedScenarios()`, `getPublishedTrials()`) filter drafts out, and draft modules are additionally kept out of the import graph. `scripts/verify-deploy.mjs` greps built bundles for known draft content strings and fails the build if any leak, so tree-shaking is enforced rather than assumed. New content starts `draft`, gets external professional review, then flips to `reviewed`.

### Deployment

`vercel.json`: SPA rewrite, `api/ai/**/*.ts` as `nodejs22.x` functions with `maxDuration: 30`, strict CSP (`script-src 'self'`, `connect-src 'self'` — no external scripts), `nosniff`, `DENY`, `no-referrer`, restrictive `Permissions-Policy`, and 1-year immutable caching for `/assets/`. `buildCommand` is `npm run verify:deploy`.

`scripts/verify-deploy.mjs` gates the artifact: LICENSE present, hashed asset filenames, all 8 avatars + hero SVG, favicon set (validating the ICO magic bytes and that `apple-touch-icon.png` is exactly 180×180), no `.env`, no credential-shaped strings or absolute Windows paths in bundles, and no draft content markers.

`tests/unit/deploy-config.test.ts` asserts these deployment invariants at unit-test speed — update it alongside any change to `vercel.json`, `package.json` scripts, or the ignore files.

Preview URLs, `*.vercel.app`, and custom domains are separate origins with separate `localStorage`. Users must export before switching domains.

## Conventions

Two-space indent, single quotes, no semicolons, trailing commas in multiline literals. Strict TypeScript — no untyped escape hatches. PascalCase for components and their files, camelCase for functions/variables, UPPER_SNAKE_CASE for module constants. Keep feature code with its feature; keep analysis, safety, validation, and reducer logic pure. Comments and user-facing strings in this repo are Chinese; match that.

Commits follow `type: concise summary` (`feat:`, `docs:`, `chore:`, `license:`).

## Privacy constraints

This app is local-first by design. Do not add telemetry, analytics, error reporting, or any persistence of free-text drafts without an explicit privacy review. The AI trial is the sole network egress, it is user-initiated with a user-supplied key, and it must stay that way. Changes to content or safety rules must preserve Zod validation and add boundary-focused regression tests.

Test setup (`tests/setup.ts`) wires `fake-indexeddb/auto`, stubs `URL.createObjectURL`, and clears `localStorage` after each test — trial persistence is testable without a browser.
