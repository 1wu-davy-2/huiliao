# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci                  # Install dependencies (Node 22.x required)
npm run dev             # Vite dev server → http://localhost:5173
npm run build           # tsc -b && vite build → dist/
npm run preview         # Preview production build locally
npm test                # All Vitest unit tests (607 tests / 29 files, 2026-08-10 实测)
npm run test:watch      # Vitest watch mode
npm run lint            # ESLint (TypeScript + React hooks)
npm run typecheck:api   # tsc against api/ only (separate project, not in tsc -b)
npm run e2e             # Playwright E2E（2026-08-08 实测：31 passed / 8 因空题池发布门 skipped）
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

9. **`src/lib/settings/AppDataContext.tsx`** — context over all app state (settings, progress, favorites, reflections, trial summaries, `aiConfig`), exposing `useAppData()`. Also owns `reducedMotion` class toggling and corrupt-storage recovery state. Every mutation funnels through `runMutation`, which converts a `StorageRecoveryRequiredError` into recovery state and returns `false` rather than throwing — so callers must check the boolean instead of assuming the write landed.

10. **`src/components/`** / **`src/features/`** — shared UI (`AppLayout`, `Modal`, `ConsentSignals`, `SkillBars`, `SkillRadar`) and page components. `features/lab/` holds `LabHubPage` (entry), `MessageLabPage`, `AiTrialPage`, `TrialReviewPage`, and `AiConfigModal` (mounted from `AppLayout`, not from the lab routes); `LabTabs` is now used only by `AiTrialPage`. `features/legal/` holds `TermsPage` and `SafetyPage`. `src/lib/skills/skills.ts` is a small skill-scoring module tested in `tests/unit/skills.test.ts`.

### Storage versioning (note the mismatch)

`SCHEMA_VERSION` is **3**, but `STORAGE_NAMESPACE` is still the literal `'huiliao:v1'`. The key is not versioned; the payload is. Reading dispatches on the `schemaVersion` field inside the JSON, so v1→v2 (backfills `trialSummaries: []`) and v2→v3 (backfills `aiConfig: undefined`) both migrate in place under the same key. Don't "fix" the namespace string to match the version — that silently orphans every existing user's data.

Each migration is a separate `if (rawVersion === N)` branch in `loadStoredDataWithStatus`, and each spreads `DEFAULT_SETTINGS` under the stored settings so a field added to `UserSettings` can't come back `undefined`. Anything newer than `SCHEMA_VERSION` falls through to `unsupported-version` recovery rather than being downgraded.

Trial history is deliberately split across two stores: full transcripts in IndexedDB, lightweight summaries in localStorage. They can drift (IndexedDB cleared independently, or a session evicted by quota), so storage exposes a reconciliation path that filters summaries down to IDs still present in the DB. Keep both sides in mind when touching either.

### AI trial request path and its security invariants

Browser (`trialClient`) → `POST /api/ai/turn` with the key in the `X-Huiliao-Api-Key` header → `api/ai/turn.ts` validates with Zod → resolves the upstream target → `api/_lib/providers/` adapts to one of three protocols (`openai-compatible`, `anthropic`, `gemini`) → normalized `{text, finishReason, usage}` back.

Invariants to preserve when editing anything under `api/` or `src/lib/ai/`:

- **The key is persisted only in `aiConfig`, and only there.** This changed deliberately — see "AI config persistence" below. It travels to the function in the `X-Huiliao-Api-Key` header and must still never reach a query string, a log, a trial record (`TrialSessionRecord`/`TrialSummary` carry `upstreamHost` and `model`, never the key), or IndexedDB.
- **The system prompt is built server-side** (`buildSystemPrompt`) and is not client-supplied.
- **`api/_lib/urlPolicy.ts` is SSRF defense** for user-supplied custom base URLs, in three ordered stages: `validateBaseUrlSyntax` (HTTPS only, ≤2048 chars, no credentials/query/fragment, no whitespace or control chars, no single-label hosts, no IPv6 zone id, no trailing dot, no traversal or encoded-separator paths, and `localhost` / `*.local` / `*.internal` / `*.home.arpa` rejected by name) → `classifyAddress` → `resolveAndPin`. Widening any stage needs a security rationale.
- **It is an allowlist, not a blocklist.** `classifyAddress` accepts only `ipaddr.js` range `unicast`, normalizing IPv4-mapped IPv6 (`::ffff:127.0.0.1`) first so loopback can't be laundered past the check. Loopback, RFC 1918, link-local (including the cloud metadata IP), CGNAT, multicast, reserved, ULA, Teredo, 6to4, and NAT64 all fall out of that single rule rather than being enumerated.
- **DNS is resolved once and pinned.** `resolveAndPin` looks up every A/AAAA record (cap 8), rejects the whole host if *any* address is non-public, then pins one address; `upstream.ts` connects to that pinned address, so there is no second lookup to rebind. Self-recursion (a base URL pointing back at this deployment) is rejected separately via `deps.selfHosts`. Path prefixes are carried through `joinPath`, since `new URL('/chat/completions', 'https://host/v1')` would silently drop `/v1`.
- **Arbitrary HTTPS ports are deliberately allowed** so users can point at a self-managed proxy. That leaves a limited public port-probing surface, so production must keep Vercel WAF / rate limiting in front of `/api/ai/*` — the module header says so explicitly.
- **`api/_lib/upstream.ts` bounds every call**: 25 s deadline, 1 MB cap, redirects rejected, no socket reuse, connects to the `PinnedTarget` rather than re-resolving, upstream status mapped to a fixed `ApiErrorCode` set.
- **Responses are scanned for key echo** and rejected as `UPSTREAM_SECRET_ECHO`.
- **CSP pins `connect-src 'self'`.** The browser therefore cannot call a custom provider directly — the function is the only egress. Any design that fetches a model endpoint from the client contradicts the deployed headers.

Tests live in `tests/unit/api-url-policy.test.ts` (alongside `api-upstream`, `api-providers`, `api-handlers`). `ResolveDeps.lookup` is injected so the DNS stage is testable without touching the network. When changing any part of the policy, add or update tests for the affected path — pinning and whole-host-rejection are the most critical.

The reviewed trial pool (`AI_TRIALS_REVIEWED`) is currently **empty**: all 18 candidate challenges sit in `ai-trials-draft.ts` awaiting professional review, so the UI shows an empty-pool state. That is intended, not a bug to route around. In dev mode (`import.meta.env.DEV`), `getPublishedTrials()` injects a `_DEV_DEMO` challenge when the pool is empty, so the AI trial UI is fully exercisable locally. The demo object lives in `src/content/ai-trials.ts` and is dead-code-eliminated from production bundles by Vite/Rollup.

`_DEV_DEMO` is `communication` / `simple` to match `AiTrialPage`'s default mode and difficulty. It was `promptcraft` / `normal`, which made "随机换一题" a silent no-op: `selectChallenge` filters the pool by mode **and** difficulty, so the one injected challenge was always filtered out and the click set `undefined` with no error surfaced. If you change either field, change `AiTrialPage`'s defaults too, or the dev pool goes dark again. `tests/unit/ai-trials.test.ts` asserts the empty case via a deliberately non-matching `promptcraft`/`normal` request, so that test is the tripwire.

### AI config persistence (a deliberate reversal)

`AiConfig` (`protocol`, `model`, `apiKey`, `targetKind`, `presetId`, `customUrl`) is stored in localStorage under `StoredData.aiConfig`, written through `updateAiConfig()` → `saveAiConfig()` on the context. This **reverses** the original "the key never touches storage" rule at the user's explicit request, so treat it as a product decision rather than drift, and don't silently revert it.

What that costs, and what still has to hold:

- Any XSS becomes key exfiltration — there is no in-memory tier left to protect. `script-src 'self'` is now load-bearing security, not just hygiene.
- **`exportStoredData()` strips `aiConfig.apiKey`.** It omits the key rather than blanking it — an empty string would fail `aiConfigSchema`'s `apiKey.min(1)` if an import path is ever added. The rest of the connection config survives, so a restored export only needs the key re-entered. Tests in `storage.test.ts` assert the key is gone, the rest is kept, and localStorage itself is untouched. Don't "simplify" this back to serializing `data` directly.
- **`aiConfigSchema` validates `customUrl` conditionally, via `.refine`, not `.min(1)` on the field.** Under `targetKind: 'preset'` the URL is legitimately `''`; a field-level `.min(1)` makes saving the *default* configuration throw `ZodError`. That shipped in `0d88a9c` and broke the most common save path — `runMutation` only converts `StorageRecoveryRequiredError`, so a `ZodError` re-throws out of the click handler and the write is silently lost. `AiConfigModal` also guards the custom-with-empty-URL case before calling. Regression tests live in `storage.test.ts` → `describe('updateAiConfig')`.
- The key is stored unencrypted. A WebCrypto wrapper was considered and deferred.
- `AiConfigModal` states the persistence in its own copy; keep that disclosure in place, because it is the only place the user is told.

The entry point is a real `<button>` in the `AppLayout` topbar (`Cpu` icon, gains `.configured` when `data.aiConfig?.apiKey` is set). That region was previously `aria-hidden` decorative glyphs — the modal is mounted from `AppLayout`, so it is reachable from every gated route, not just `/lab/ai`.

`AiTrialPage` **must** keep its `useEffect` that copies `savedConfig` into local state. Its fields are `useState` initialized from `data.aiConfig`, which only runs on mount; without that effect, saving from the modal leaves the already-mounted trial page showing stale empty inputs. Relatedly, switching protocol/target now clears only the consent checkbox — clearing the key there would wipe a value the user just persisted.

### Routing & auth gate

In `src/app/App.tsx`. Corrupt storage short-circuits to `StorageRecoveryPage` before any routing.

**`/` and `/onboarding` are both ungated.** `/` is the marketing `LandingPage` (`src/features/landing/`), which self-redirects to `/home` once **both** `onboardingCompleted` and `isAdultConfirmed` are true — so returning users never see it. `/onboarding` sets those two flags and then navigates to `/home` (not `/`, which would bounce through the landing redirect). Every other route sits behind `<RequireOnboarding>`, which redirects to `/onboarding` unless both flags are true.

Routes: `/` (landing, ungated), `/onboarding` (ungated), then gated: `/home` (the workbench, formerly `/`), `/practice`, `/practice/:id`, `/lab` (hub page), `/lab/message`, `/lab/ai`, `/lab/ai/review/:sessionId`, `/progress`, `/settings`, `/privacy`, `/terms`, `/safety`, with `*` → `/`.

The `/` → `/home` move is load-bearing for tests: an assertion that "an unonboarded visit redirects to onboarding" must target `/home`, not `/`, or it will render the landing page and fail. `NAV_ITEMS` and `PAGE_CONTEXT` in `AppLayout.tsx` key off `/home` too.

Onboarding is **2 steps**, not 4 (`STEPS = ['了解与选择', '基线确认']`). Step 0 pairs the 18+ checkbox with challenge selection; step 1 pairs the 3 baseline questions (radios) with the 3 interaction principles (checkboxes). The final button reads `完成并进入首页`. Step-0 validation needs `adultConfirmed && challenges.length > 0`, so a test that ticks only the 18+ box cannot advance.

### Local dev of the `api/` functions

`vite.config.ts` registers `devApiPlugin()` (`apply: 'serve'`), which serves the Vercel functions off the ordinary Vite dev server — `npm run dev` alone is enough, no `vercel dev` and no second process. It intercepts `/api/*`, buffers the body, and calls the real handler through `server.ssrLoadModule('/api/ai/turn.ts')`, so `api/` TypeScript runs untranspiled-by-hand and edits hot-reload.

Two things the plugin does that production does not:

- **Backfills a missing `Origin` header** from `Host`, because `originAllowed()` rejects header-less requests and curl/Postman send none by default. On Vercel the browser always supplies it.
- **`api/_lib/challenges.ts` injects the `_DEV_DEMO` challenge** into its server-side reviewed map when `process.env.NODE_ENV !== 'production'` and the pool is empty. Without it every request dies at the `hasReviewedPool()` publish gate. This mirrors the client-side `getPublishedTrials()` injection; keep the two in sync.

Both are dev-only by construction — do not let either leak into a production path.

Three `api/_lib/` helpers not covered above: `http.ts` provides `originAllowed()` (referenced by the devApiPlugin's Origin backfill), `contracts.ts` holds shared Zod schemas for request/response validation, and `errors.ts` maps upstream failures to the fixed `ApiErrorCode` set.

**The server never guesses a path prefix; the client fills it in.** `joinPath` only appends the adapter path (`/messages`, `/chat/completions`) to whatever prefix arrives, since Gemini uses `/v1beta` and self-hosted proxies may sit at the root. So a `baseUrl` that reaches `api/` without its prefix stays broken.

Client-side, `normalizeBaseUrl(raw, protocol)` closes that gap: when the user's URL has an empty or `/` pathname it appends `/v1` (`/v1beta` for Gemini), and it leaves any non-root path untouched so `/v2` or a nested proxy mount survives. It is defined **twice** — in `AiConfigModal.tsx` (applied on save) and in `AiTrialPage.tsx` (applied to every outbound `target`) — because the trial page's fields are editable after load and must normalize whatever the user typed there, not just what was saved. Change one, change the other.

A missing prefix still surfaces as `UPSTREAM_BAD_RESPONSE` rather than a 404: many gateways answer `POST /messages` with their own HTML homepage at **HTTP 200**, which clears every status check and only fails at `parseJsonOnce`.

### CSS system

`src/styles/tokens.css` holds design tokens — off-white `--bg: #fcf9f8`, dark `--ink: #1c1b1b`, sage `--primary: #3c683b`, brick `--warning: #ba1a1a`. Type is a three-family stack: `--font-display` (Hanken Grotesk) for page titles, `--font-sans` (Be Vietnam Pro) for body, `--font-label` (Work Sans) for small uppercase labels — each falling back to PingFang SC for CJK, since the Latin faces are subset to Latin only. `src/styles/fonts.css` imports those self-hosted faces from `@fontsource*` packages (CSP is `font-src 'self'`, so remote font CDNs are blocked). `src/styles/global.css` has the layout system, utilities (`.card`, `.btn`, `.row`, `.mt-*`), the `.page-with-aside` main+aside grid, and the sidebar → bottom-nav breakpoints. Trial-specific styles are scoped in `features/lab/aiTrial.css`.

### Content review lifecycle

Scenarios, privacy topics, and trial challenges carry `reviewStatus: 'draft' | 'reviewed'`. Production getters (`getPublishedScenarios()`, `getPublishedTrials()`) filter drafts out, and draft modules are additionally kept out of the import graph. `scripts/verify-deploy.mjs` greps built bundles for known draft content strings and fails the build if any leak, so tree-shaking is enforced rather than assumed. New content starts `draft`, gets external professional review, then flips to `reviewed`.

### Deployment

`vercel.json`: SPA rewrite, `api/ai/**/*.ts` functions with `maxDuration: 30`, strict CSP (`script-src 'self'`, `connect-src 'self'` — no external scripts), `nosniff`, `DENY`, `no-referrer`, restrictive `Permissions-Policy`, and 1-year immutable caching for `/assets/`. `buildCommand` is `npm run verify:deploy`.

**Do not add `runtime` to the `functions` block.** That field is only for community runtimes (an npm package plus version, e.g. `vercel-php@0.7.3`); `nodejs22.x` is AWS Lambda syntax and Vercel rejects it during *config validation*, before the build container starts. This bit once: the block landed with `"runtime": "nodejs22.x"` in `1c78ec7`, and every push after that failed while `npm run verify:deploy` kept passing locally — production sat frozen on the last pre-`functions` commit for three days with no build log to explain it. The Node version comes from `engines.node` (`22.x`) plus the project's Node setting in the dashboard. `deploy-config.test.ts` now asserts `runtime` is absent, so a re-add fails at unit-test speed.

`maxDuration: 30` requires a paid plan; Hobby caps Node functions at 10 s and will fail validation the same silent way.

`scripts/verify-deploy.mjs` gates the artifact: LICENSE present, hashed asset filenames, all 8 avatars + hero SVG, favicon set (validating the ICO magic bytes and that `apple-touch-icon.png` is exactly 180×180), no `.env`, no credential-shaped strings or absolute Windows paths in bundles, and no draft content markers. The 8 avatar SVGs and `public/hero.svg` are programmatically generated — run `node scripts/generate-assets.mjs` to regenerate them. The favicon set is generated by `node scripts/generate-favicon.mjs`.

`tests/unit/deploy-config.test.ts` asserts these deployment invariants at unit-test speed — update it alongside any change to `vercel.json`, `package.json` scripts, or the ignore files.

Preview URLs, `*.vercel.app`, and custom domains are separate origins with separate `localStorage`. Users must export before switching domains.

**Current deploy status (2026-08-10):** Production release is **BLOCKED** pending: Vercel Preview deployment + WAF/rate-limiting configuration (requires project-owner Vercel login), keyboard manual acceptance, external professional content review (s14–s21 scenarios + 18 AI trial candidates), legal and sexual-health copy review, and Vercel AUP confirmation. All automated checks pass; blockers are operational and content-review items only.

## Conventions

Two-space indent, single quotes, no semicolons, trailing commas in multiline literals. Strict TypeScript — no untyped escape hatches. PascalCase for components and their files, camelCase for functions/variables, UPPER_SNAKE_CASE for module constants. Keep feature code with its feature; keep analysis, safety, validation, and reducer logic pure. Comments and user-facing strings in this repo are Chinese; match that.

Commits follow `type: concise summary`. Common prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `merge:`, `license:`.

## Repo infrastructure notes

**Vitest config lives inside `vite.config.ts`** (not a separate `vitest.config.ts`): `environment: 'jsdom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['tests/unit/**/*.test.{ts,tsx}']`, `css: false`. The `include` pattern is why `npm test` runs only unit tests and never touches E2E.

**No `.github/` directory.** There are no CI workflows. All gating runs through Vercel's `buildCommand` (`npm run verify:deploy`). PR checks don't exist — the build is the gate.

**`AGENTS.md`** exists at repo root as a higher-level companion to this file. Keep the two reconciled; CLAUDE.md is the authoritative source for architecture and invariants.

**License:** AGPL-3.0 (strong Copyleft). Fonts are SIL OFL 1.1, self-hosted under `public/licenses/` — `verify:deploy` asserts the OFL license file exists.

**`scripts/fix-scenario-paths.mjs`** is a maintenance script for bulk-updating scenario path references; invoke it explicitly when scenario graph structure changes.

**Stale git worktrees** under `.claude/worktrees/` contain full repo checkouts (including built `dist/`) and will double-match every repo-wide grep/glob unless excluded or removed. Check `git worktree list` and prune any that are already merged.

## Privacy constraints

This app is local-first by design. Do not add telemetry, analytics, error reporting, or any persistence of free-text drafts without an explicit privacy review. The AI trial is the sole network egress, it is user-initiated with a user-supplied key, and it must stay that way. Changes to content or safety rules must preserve Zod validation and add boundary-focused regression tests.

The one carve-out is `aiConfig` — the API key is persisted at the user's request (see "AI config persistence"). Everything else that guarantee covered still holds: drafts, free-text input, and reflections stay unpersisted, and no transcript leaves the device except through the user-initiated trial call. `README.md` and the in-app `/privacy` page have been reconciled with this (key in localStorage, stripped from exports); if you change the persistence or export behaviour again, update both in the same commit — they are user-facing privacy promises, not incidental docs.

Test setup (`tests/setup.ts`) wires `fake-indexeddb/auto`, stubs `URL.createObjectURL`, and clears `localStorage` after each test — trial persistence is testable without a browser.
