# Plan 04 — The contract, money and the API layer

**Status:** done 2026-09-11 — GREEN LIGHT 2026-09-11 · **Timebox:** 60 min of execution
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

## What happened

Executed 2026-09-11 on `build/04-api-layer`, from 12:48 to 13:29. Steps 1–9 and 11 fit inside the
60-minute timebox; two items were cut, as the cut order allowed. The reviews ran after it.

- *Update batch (QR-25):* `bun outdated` offered nothing. The newer `@babel/core` and `@biomejs/biome`
  are still inside the quarantine.
- *The orval 8.31.0 review (CC-05), before the install:*
  - 13 packages (`orval` and 12 `@orval/*`), all published by one maintainer, none with provenance,
    none with install scripts;
  - 21 commits between `v8.30.0` and `v8.31.0`, all verified: human authors and the release bot;
  - the manifests change only versions, `js-yaml` 4.3.2 and optional peers; `bin/orval.ts` adds
    `--quiet`;
  - the published tarballs of `orval`, `@orval/core`, `query`, `zod` and `fetch` have the same file
    lists apart from one renamed hashed chunk, and the same count of process-spawning calls (3 and 3).
  - Admitted through `minimumReleaseAgeExcludes`, with the review in `bunfig.toml`'s comment. `bun audit`
    stayed clean at 373 packages.

**Deviations and surprises**

- *The transport landed before the generated client.* orval reads the mutator when it generates, and the
  generated calls import it, so step 7's transport moved into step 6's first commit.
- *Cut 1: the transport try-out* (`includeZodSchemaInArguments`), for time. D-03 keeps the check in the
  adapter; its growth path is unchanged.
- *Cut 2: mutation testing, moved to plan 07.*
  - Installing `@stryker-mutator/core` 10.0.0 turned `bun audit` red. Stryker pins
    `typed-rest-client` `~2.3.0`, and 2.3.1 pins `qs` 6.15.1, which carries three moderate advisories:
    GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g and GHSA-q8mj-m7cp-5q26. The fix is in `typed-rest-client`
    3.1.1 (`qs ^6.16.0`), outside Stryker's range.
  - An `overrides` entry for `qs` 6.16.0 (12.5 days old, past the quarantine) would clear it. But that is
    a package decision not yet agreed, so the install was rolled back instead:
    - `package.json` and `bun.lock` restored from git;
    - `node_modules` synced;
    - audit clean again.
  - The prepared `stryker.config.json` waits in the session scratchpad. Plan 07 brings the choice to the
    author: the override, or a Stryker release on the newer client. Deliberate breaks still prove every
    test.
- *The Docker gate runs for any `package.json` change*, a new script included. The sandbox cannot write
  `~/.docker`, so three commits ran outside it. `CLAUDE.md` now says so.
- *Biome wrapped a long type-level case,* which moved the error off the line its `@ts-expect-error`
  covers. Each case now stays on one line, with a comment saying why.
- *A failed commit left a tangle, recovered without loss.*
  - A commit failed on formatting inside a `set -e` script and stopped before `git stash pop`. The retry
    popped a stash that conflicted on `transport.test.ts`.
  - The conflict was resolved to the formatted side. The stash's 13 untracked files were compared byte
    for byte with the tree before `git stash drop`.
  - Lessons:
    - format before committing;
    - check each commit's exit code rather than rely on `set -e` around a stash;
    - set aside only untracked paths.
- *A command that moved the mock files with `mv` after an `rm -rf` was declined by the author.* It was redone
  with `git stash push --include-untracked -- mock tsconfig.mock.json`.
- *A deliberate break that did not apply.* The first cancellation break used GNU `sed`'s `0,/re/`,
  which macOS's `sed` ignores. The test did not fail, and a count showed the line still there. It was
  redone with `perl` and then failed as expected. From then on every break printed a count proving it
  applied before its run was trusted.
- *A proof that failed for the wrong reason, at the review fixes.* The old drift gate, run against a
  read-only `src/api/generated`, left read-only copies in the scratch folder. The next drift run exited
  1 on `rm`, not on drift. The output was read, not the exit code alone: permissions restored, the run
  redone, and it failed on the diff.
- *`bunx --bun biome` ran once, to format the review fixes.* It used the installed Biome and downloaded
  nothing, but runners are meant to ask first. Later runs call `node_modules/.bin/biome`.

**Proof (QR-23)** — every row seen failing, then restored:

| Test or gate | Break | Seen |
|---|---|---|
| type-level amount test | `NoInfer` removed | TS2578 on the two-assets line |
| DOM-free domain | `document` in `src/domain` | TS2584 under `tsconfig.domain.json` only |
| amount arithmetic | the `decimals` comparison removed | "refuses one asset with two precisions" fails |
| exact formatting | `toDecimalString` through `Number` | `1.1234567890123457` and `-5e-18`; three tests fail |
| credentials | `include` | the credentials test fails |
| cancellation | the first `cancelled()` check removed | "expected ApiError: API network error … to not be an instance of ApiError" |
| error shape | the http error loses its body | the Problem-body test fails |
| drift gate | the contract gains `instance`, not regenerated | exit 1, the diff in `problem.zod.ts`, the tree left as it was |
| the adapter's check | the schema check removed | a raw `RangeError` ("The number 1.5 cannot be converted") instead of `ApiError` |
| retry policy | 4xx made retryable | the "shows at once" test fails |
| dataset conformance | one asset with `decimals: 40` | the contract test fails (and the cursor walk, which parses) |
| determinism | the seed from `Date.now()` | the same-seed test fails |
| the stand-in's abort | the abort listener removed | the abort test fails |
| `api/generated` private | the check disabled | fixture: "expected, not reported: … api/generated is private to api" |
| `src/` stays inside | the check disabled; a real `src/api/leak.ts` importing the stand-in | fixture fails on both markers; oxlint exit 1 on the real file |
| a gateway's empty 503 (review fix) | HEAD's transport, which parsed before it read the status | "expected ApiError: API contract error … to match object { problem: { kind: 'http' … } }" |
| a body dropped mid-read (review fix) | the same | `"kind": "contract"` received where `"network"` was expected |
| the stand-in's query check (review fix) | HEAD's handler | all 8 forbidden queries: "expected 200 to be 400" |
| the drift gate writes nothing (review fix) | `src/api/generated` made read-only | the new gate exit 0; the old gate EACCES, exit 1; the folder identical to HEAD after both |
| the drift gate still catches drift (review fix) | the contract's `maximum: 200` made 300, not regenerated | exit 1, `listTransactionsParamsLimitMax = 300` in the diff; exit 0 once restored |

**Verification**

- Full `check`, exit 0, last run after the review fixes:
  - format;
  - the layer fixture's 26 expected violations and nothing else;
  - the contract matches;
  - 37 tests;
  - the build;
  - no leaks;
  - `bun audit` clean at 373 packages.
- The same `check` ran in Docker through the pre-commit gate on each commit that changed `package.json`.
- `bun run generate` twice gave identical output.
- `vite build`: no file in the bundle contains `usdt-tron`, `generateTransactions` or `Injected failure`.

**Versions used:** orval 8.31.0, zod 4.5.4, TanStack Query 5.102.8, Vitest 5.0.0, TypeScript 7.0.2,
Vite 8.3.0, Bun 1.4.2, Node 24.21.0.

**Reviews at wrap-up**

- `/security-review` — no finding met its bar. What it checked:
  - the transport: same-origin credentials, set after the caller's options; a base URL on this site;
  - query values encoded through `URLSearchParams`;
  - every response through `safeParse` before use: unknown keys dropped, `BigInt` only after the digits
    pattern;
  - `Intl` fed validated strings only;
  - the stand-in: test-only, lint-enforced, absent from the bundle;
  - the drift script's fixed paths;
  - the lockfile: registry sources, no install scripts.
- `/code-review` — four findings. Three are fixed here; one waits for the author.
  1. *Some fiat amounts would display 100× or 1000× too large* (medium). **Open: needs the author.**
     - The contract sends `minor` in the ISO 4217 minor unit. `formatAmount` takes the fraction digits
       from `Intl`, which follows CLDR, and the two tables disagree.
     - Measured on Node 24.21 (ICU 78.3, CLDR 48): HUF, IDR, ALL, LAK, LBP, IRR and MGA get 0 digits
       where ISO says 2; IQD gets 0 where ISO says 3. `{ currency: 'HUF', minor: 123456n }` would print
       `HUF 123,456`, not `HUF 1,234.56`.
     - D-08 was accepted with "`Intl` is the source of the minor digits, no currency table", tested on
       EUR, JPY and KWD only. The fix is an amendment to D-08, agreed before any code. Nothing formats
       fiat on a screen until plan 07.
  2. *A gateway's empty 503 became a permanent contract error* (medium). **Fixed.**
     - The transport parsed the body before it read the status, and reported any failure to read it as
       a contract error. The 503 was lost, and `isRetryable` never retried it. A connection dropped
       mid-body was a contract error too.
     - Now the body is read in full inside the network step, so a failed read is a network error. A
       failed response keeps its status whatever its body. Only a successful response whose JSON does
       not parse is a contract error.
  3. *The stand-in accepted queries the contract forbids* (low). **Fixed.**
     - `limit=0` paged forever, the same `nextCursor` each time. A negative limit, a cursor that is not
       a number and an unknown `kind` all got a 200.
     - The handler now judges the query with the contract's generated `ListTransactionsParams`, so no
       bound is copied by hand, and answers 400 Problem. A cursor that is not an offset is refused too.
  4. *An interrupted drift check could leave `src/api/generated` missing* (low). **Fixed.**
     - The gate regenerated in place, and orval's `clean` empties the folder first. The image's `sh` is
       dash, which does not run an `EXIT` trap on SIGINT or SIGTERM. A dev server watching `src/` also
       saw the folder vanish during every check.
     - The gate now copies what orval reads (its config, the contract, the mutator, `package.json`) into
       a scratch tree under `node_modules/.cache`, and generates there. It never writes to the tree.
  - Checked and fine: 3 retries from `failures < 3`; cancellation passes through untouched; the
    generated patterns keep `BigInt` from throwing; `toDecimalString` at zero, negative, tiny and
    0-decimal amounts; the layer rule's two new refusals; the `@/` alias through Vite's resolver.
