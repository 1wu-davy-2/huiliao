# Repository Guidelines

## Project Structure & Module Organization

The application is a React 18/Vite SPA written in TypeScript. Keep routing and startup code in `src/app/`; feature pages belong in `src/features/<feature>/`, reusable UI in `src/components/`, and domain logic in `src/lib/`. Static content, schemas, shared types, and CSS live in `src/content/`, `src/schemas/`, `src/types/`, and `src/styles/`. Use the `@/` alias for imports from `src`.

Unit and component tests are in `tests/unit/`; browser flows are in `tests/e2e/`. Public images belong under `public/images/`. Repository utilities live in `scripts/`, while product, testing, and deployment decisions are documented in `docs/`.

## Build, Test, and Development Commands

- `npm ci`: install the locked dependency set. Use Node 22.x.
- `npm run dev`: start Vite at `http://localhost:5173`.
- `npm run lint`: run ESLint.
- `npm run test`: run Vitest once; use `npm run test:watch` while developing.
- `npm run build`: type-check with `tsc -b` and create `dist/`.
- `npm run e2e`: run Playwright desktop, tablet, and mobile projects. Install a browser first with `npx playwright install chromium` when needed.
- `npm run verify:deploy`: run linting, unit tests, the production build, and deployment-artifact checks. It does not include Playwright.

## Coding Style & Naming Conventions

Follow the existing style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline structures. TypeScript is strict; resolve unused variables and avoid untyped escape hatches. Name React components and their files in PascalCase (`PrivacyPage.tsx`), functions and variables in camelCase, and module-level constants in UPPER_SNAKE_CASE. Keep feature-specific code with its feature and prefer pure functions for analysis, safety, and validation logic.

## Testing Guidelines

Use Vitest and React Testing Library for `*.test.ts` and `*.test.tsx`; use Playwright for `*.spec.ts` flows. Test observable behavior, prefer accessible role/label queries, and add regression cases for safety, storage, routing, or scenario changes. There is no configured coverage threshold. If Playwright cannot run, report it as `BLOCKED` and follow `docs/TESTING_WITHOUT_PLAYWRIGHT.md`; do not claim full E2E success.

## Commit & Pull Request Guidelines

History follows `type: concise summary`, including `feat:`, `docs:`, `chore:`, and `license:`. Keep each commit focused and use a concrete summary. Pull requests should explain behavior and risk, link relevant issues or plans, list verification commands and results, and include desktop/mobile screenshots for visual changes. Explicitly disclose skipped or blocked checks.

## Privacy & Safety

This app is intentionally static and local-first. Do not add telemetry, server uploads, or persistence of free-text drafts without an explicit privacy review. Changes to content or safety rules must preserve Zod validation and include boundary-focused tests.
