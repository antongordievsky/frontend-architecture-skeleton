# Plan 04 — The contract, money and the API layer

**Status:** in progress — GREEN LIGHT 2026-09-11 · **Timebox:** 60 min of execution
**Serves:** FR-3, FR-6 (the first tests), QR-1, QR-2, QR-5, QR-6, QR-11, QR-23, DR-2 (the transport's part),
DR-8 · **Applies:** D-03, D-04, D-08, D-09, D-17, D-24 (amended below), D-16, D-23, D-01

## Why this plan exists

Plans 01–03 built the frame: the app, its gates and its boundaries. No data exists yet, and nothing in
the code knows what an amount is. This plan builds the path every number takes to a screen:
1. the contract;
2. the generated client;
3. one exit to the network;
4. a check at the boundary;
5. money as exact integers.

It also builds a seeded stand-in for the backend, and the first tests. No screen is built here. The first
screen that shows this data is plan 07's transactions page.

## Approach

| Piece | Where | Decision |
|---|---|---|
| The contract | `contract/openapi.yaml`: `GET /transactions` with `cursor`, `limit` and `kind`; a `deposit \| withdrawal \| trade` union; amounts as `{ asset, decimals, baseUnits }`, fiat value as `{ currency, minor }`, both integer strings; errors as `Problem` (`application/problem+json`) | D-01, QR-5 |
| The generated client | `src/api/generated/`: types, Zod Mini schemas, and calls through our transport; `orval.config.ts`; `bun run generate` | D-24, D-03 |
| Drift gate | `check` regenerates into `node_modules/.cache/` and fails if the result differs from `src/api/generated/` | QR-5 |
| Money and transactions | `src/domain/amount.ts`, `src/domain/transaction.ts`; `tsconfig.domain.json` without the DOM; `amount.typetest.ts`, which `tsc` checks | D-08, D-01 |
| The transport | `src/api/transport.ts`: base URL `/api`, `credentials: 'same-origin'`, `ApiError` of kind `network`, `http` or `contract`, with the `Problem` body; a cancelled request passes through untouched; exports `ErrorType` | D-03, D-17 |
| Cache policy | `src/api/queryClient.ts`: retries only network failures and 5xx; `Register.defaultError` is `ApiError` | D-03, D-17 |
| The adapter | `src/api/transactions.ts`: `transactionsQuery(params)`, a `queryOptions` factory; its query function checks with the generated schema and maps to domain types | D-03 |
| The stand-in | `mock/dataset.ts` (seeded, typed from the contract) and `mock/handler.ts` (`(Request) => Promise<Response>`, with `latencyMs` and `failStatus`) | D-04 |
| Tests | Vitest 5.0.0 in Node, `*.test.ts` beside the code; `check` runs `vitest run` | D-09 |
| Boundaries | lint: `api/generated` private to `api`; no import from `src/` leaves it, except a test file reaching `mock/`; fixture cases for each | D-03, D-04, D-16 |
| Mutation testing | `stryker.config.json`, incremental, on `src/domain`, `src/api` (not `generated`) and `mock`; `bun run mutate`, at wrap-up, outside `check` | D-09 |

**Arrives with its first consumer, in plan 07:**
- `mock/server.ts` (`Bun.serve`) and the `mock` compose service;
- the dev server's `/api` proxy and Caddy's;
- `QueryClientProvider` in the shell.

Today only tests consume the handler, and they plug it straight into `fetch`. Wiring a server nobody
calls would be structure without a tenant (QR-8). It would also send a `compose.yaml` change, which the
agent's sandbox cannot write, through the author before anything uses it.

**The `@/` alias** (tsconfig `paths` and Vite's `resolve.tsconfigPaths`, D-16) arrives here with the
first import across layers: the adapter importing `domain`.

### D-24, amended — needs the author's agreement with this plan

D-24 says `orval` also generates MSW handlers with mock data (`mock.required: true`). D-04 has since
rejected generated mocks: random assets and random precision per amount, and no dataset. The amendment
reads:

> *Amended 2026-09-11, agreed by the author:* `orval` generates the types, the Zod Mini schemas and the
> calls through our transport. It does not generate mocks: D-04 chose a seeded, hand-written stand-in, so
> `mock` and `mock.required` are not set, and neither MSW nor faker is installed. The generated hooks go
> unused (D-03).

## Steps

1. **Docs.** The D-24 amendment and this plan.
   - Commits: `docs(decisions): amend D-24, the generator writes no mocks (D-04)` and
     `docs(plans): add plan 04, the contract and the API layer`.
2. **Update batch (QR-25).** `bun outdated` offered nothing on 2026-09-11. `@babel/core` and
   `@biomejs/biome` are inside the quarantine. This is recorded in the log, with no commit.
3. **The orval 8.31.0 review (CC-05), before anything is installed.**
   - Publisher and provenance of `orval` and the 12 `@orval/*` packages at 8.31.0.
   - No install scripts in any of them.
   - The commits and changed files between the `v8.30.0` and `v8.31.0` tags (GitHub compare).
   - `bun audit` after the install.
   - If the review finds anything, the choice goes back to the author. Otherwise
     `minimumReleaseAgeExcludes` names the 13 packages, with a comment: a reviewed security fix, to be
     removed at plan 05's batch.
4. **Packages**, one `bun add` each, verified in the registry first (D-23):
   - `@tanstack/react-query` 5.102.8 and `zod` 4.5.4 (4.6.x is inside the quarantine);
   - development: `orval` 8.31.0 and `vitest` 5.0.0.
   - Commit: `build(deps): add orval, zod, TanStack Query and Vitest`. The Docker gate runs, so it is
     committed outside the sandbox, with the author's approval.
5. **Domain.**
   - `amount.ts`, `transaction.ts`, `tsconfig.domain.json` (referenced from `tsconfig.json`), the
     type-level test, and `amount.test.ts`.
   - `check` gains `vitest run`, in this commit, since this is the first test.
   - Commit: `feat(domain): amounts as integer units, and the transaction union (D-08)`.
6. **Contract and generation.**
   - The contract and `orval.config.ts` go in one commit. The generated output goes in the next, with the
     exact command in its body (QR-20).
   - The drift gate goes in a third commit.
   - Commits: `feat(contract): the transactions endpoint`, `build(api): generate the client from the
     contract`, `build(api): fail check when the generated client drifts from the contract`.
7. **The API layer.**
   - The transport, the cache policy, the adapter and the `@/` alias, with their tests.
   - Then, as its own commit, the try-out D-03 asked for: on 8.31.0, `includeZodSchemaInArguments`
     hands the schema to the transport. If it typechecks and a malformed payload fails as `contract`,
     the check moves into the transport and the adapter keeps only the conversion. That is D-03's
     "Wrong if", recorded as a course correction. If not, it is recorded and dropped.
   - Commits: `feat(api): the transport, the cache policy and the transactions adapter`, and, if it holds,
     `refactor(api): check responses in the transport`.
8. **The stand-in.**
   - `mock/dataset.ts`, `mock/handler.ts`, `tsconfig.mock.json`, and their tests.
   - The adapter's integration test switches from a hand-made response to the handler.
   - Commit: `feat(mock): a seeded stand-in for the transactions endpoint (D-04)`.
9. **Boundaries.**
   - The layer rule learns two refusals:
     - `api/generated` imported outside `api`;
     - an import from `src/` that resolves outside it, unless the importer is a test file and the target is
       in `mock/`.
   - Fixture cases for each, plus an allowed test import.
   - Commit: `build(lint): keep generated code inside api, and the app inside src`.
10. **Mutation testing.** `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` 10.0.0,
    `stryker.config.json`, and `bun run mutate`.
    - Commit: `build(test): mutation testing for the wrap-up (D-09)`. It is committed outside the sandbox.
11. **Docs.**
    - `CLAUDE.md`: `test`, `generate` and `mutate`, and where tests live.
    - This plan's log.
    - Commit: `docs: record plan 04`.

## Proof — each new test and gate seen failing (QR-23)

| Test or gate | Deliberate break | Expected |
|---|---|---|
| the type-level amount test | `NoInfer` removed from `addCrypto` | `tsc` TS2578 on the two-assets line |
| the DOM-free domain | `document` read in `src/domain` | typecheck TS2584 under `tsconfig.domain.json` |
| amount arithmetic | the `decimals` comparison removed | `decimals-mismatch` test fails (the gap the D-09 spike found) |
| exact formatting | `toDecimalString` via `Number` | the 18-decimal test fails with `…0123457` |
| the drift gate | the contract edited, not regenerated | `check` exit 1, naming the differing file |
| the adapter's check | a payload with `baseUnits: 1.5` | the test sees `ApiError { kind: 'contract' }`; with the check removed, it fails |
| the transport's error shape | a 503 with a `Problem` body; a rejected `fetch` | `http` with status and body; `network` |
| cancellation stays untouched | the transport wraps every rejection as `network` | the abort test fails |
| credentials | `include` instead of `same-origin` | the credentials test fails |
| retry policy | a 4xx made retryable | the retry test fails |
| the dataset | the generator emits `decimals: 40` for one asset | the schema-conformance test fails |
| determinism | the seed taken from `Date.now()` | the same-seed test fails |
| `api/generated` private | a `domain` or zone file importing it (fixture) | the fixture test names the reason |
| the app stays in `src/` | a non-test file in `src/` importing `mock/` (fixture); the same import from a test file | a report for the first; silence for the second |
| mutation testing | run at wrap-up | a score in the log; each survivor killed by a test or recorded with its reason |

## Verification

- Full `check`, on the host and in Docker (`docker compose run --rm check`).
- `bun run generate` twice gives no diff (determinism of the generator).
- `vite build`: no `mock/` code in the bundle. The build's module graph cannot reach it, and a grep
  of `dist` for a string only the dataset holds finds nothing.
- `bun run mutate` at wrap-up, outside the sandbox (Stryker listens on a port: `EPERM` inside it).
- `/code-review` and `/security-review` on the plan's diff. No UI exists, so there is no Playwright pass.

## Out of scope

- A screen, the provider in the shell, the mock server, compose and proxy wiring (plan 07).
- The session query, sign-in, the 401 reaction and CSRF (D-17, with the first sign-in screen).
- Pagination, sorting and filtering beyond a cursor (D-06, plan 07). The contract's list endpoint is a
  placeholder that D-06 may reshape.
- Browser tests and Playwright (D-09, plan 07); property-based tests (D-09's growth path).

## Timebox

60 minutes of execution; the largest plan, and the take-home's 1.5–2 h budget is already spent by plans
01–03 (01 overran its 30 minutes; 02 took about 55 with its reviews; 03 about 25). The cut order, from
the bottom:
1. the transport try-out (step 7's second commit) — D-03 keeps the check in the adapter;
2. mutation testing (step 10) — moves to plan 07's wrap-up; deliberate breaks still prove every test;
3. the boundary refusals (step 9) — then `ARCHITECTURE.md` names both as review-only until they land.

Every cut is recorded here and in `ARCHITECTURE.md` § Skipped.
