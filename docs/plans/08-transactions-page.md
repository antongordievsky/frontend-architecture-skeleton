# Plan 08 — The transactions page: ten thousand rows, answered by the server

**Status:** GREEN LIGHT (2026-09-12) · **Timebox:** 90 min of execution
**Serves:** FR-3, FR-4, FR-7, QR-6, QR-12, QR-17, QR-22, QR-23, QR-24, C-2 · **Applies:** D-06, D-04,
D-03, D-05, D-07, D-09, D-12, D-14 (amended), D-16, D-28, D-29

## Why this plan exists

Everything built so far has been proven in isolation: the contract has types, the transport has tests, the
shell has routes and now a look, the kit has parts and baselines. Nothing has yet put them together on a screen,
and the stand-in backend has never been a server — it has only ever been a function plugged into `fetch` inside a
test. This plan is the first time the whole build runs end to end: a browser loads the production bundle,
asks a real server over HTTP for a page of transactions, and shows them.

It also makes D-06's rule visible, because that rule is what keeps the screen honest: **nothing is computed
from the pages already loaded**. The first hundred rows sorted by value look exactly like the hundred largest
transactions, and are not. So sorting and filtering are the server's work, and the screen only asks.

## Approach

| Piece | Where | Decision |
|---|---|---|
| The stand-in becomes a server | `mock/server.ts` = `Bun.serve({ fetch: createHandler(options) })`, options read from the environment (`MOCK_SEED`, `MOCK_COUNT`, `MOCK_LATENCY_MS`, `MOCK_FAIL_STATUS`) so loading and failure states can be seen without touching code. **No new Dockerfile stage:** the compose service runs the image that already exists with a different command, which is one less stage to build and rebuild. One origin everywhere: Vite's `server.proxy` sends `/api` to it in development, Caddy `reverse_proxy` in the production form. The handler itself does not change shape — the same function still serves the tests | D-04, D-12, C-2 |
| Sorting in the contract | `contract/openapi.yaml` gains a `sort` parameter: an enum of `occurredAt:desc` (the default), `occurredAt:asc`, `value:desc`, `value:asc`. An enum, not free text, so the router, the schema and the server cannot disagree about what is sortable. `bun run generate` writes the types; the drift gate proves the tree matches | D-06, QR-5 |
| The server sorts, filters and pages | `mock/handler.ts` applies `kind`, then `sort`, then the cursor — in that order, over the whole dataset. **Every sort ends with the row id as a tiebreaker**, because a cursor walking a non-unique key repeats one row and skips another, invisibly. The cursor stays opaque to the client | D-06, D-04 |
| One cache entry per question | `src/api/transactions.ts` gains `transactionsInfiniteQuery(params)` built on `infiniteQueryOptions` (in `@tanstack/react-query` 5.102.8; orval generates no infinite variant, measured). `getNextPageParam` reads `nextCursor`. Pages of 100 — 21 kB each, measured. The adapter still checks every page against the contract's schema and hands the screen domain rows (D-03) | D-06, D-03, FR-3 |
| The address owns the question | `src/routes/_app/transactions.index.tsx` gains a `validateSearch` schema in `zod/mini`: `kind` and `sort`, each wrapped in `catch` with its default, so a mangled shared link falls back instead of breaking. The route's loader prefetches the first page through the same `queryOptions`, so the route and the screen read one cache entry | D-05, D-06 |
| The table is a part | `src/ui/Table/` wrapping React Aria's `Table`, `TableHeader`, `Column`, `TableBody`, `Row`, `Cell`, inside its `Virtualizer` with `TableLayout`. Its stylesheet uses tokens only — the ones plan 07 fixed — styles the sortable header through `[data-allows-sorting]` and `[data-sort-direction]`, and keeps the focus ring and the pointer. A story per state, a spec, baselines in three engines. Cost measured: about 44 kB gzip for the table, 6.2 kB for virtualisation | D-07, D-28, D-29, D-14 |
| The page | `src/app/pages/Transactions/`: columns declared as data next to the page, not markup repeated per row. The four states (FR-7) plus the two that only a paged screen has — loading the next page, and failing while loading it. Empty and "nothing matches this filter" are different screens with different words. Sorting a column writes the new order into the address; it never reorders the rows in hand | D-06, FR-7 |
| Page tests | `playwright/pages/*.spec.ts` against `web-prod` — the production bundle behind Caddy, with the stand-in behind `/api` (D-09: browser tests run against the production form). `playwright.config.ts` grows a second group of projects with that base URL, **in Chromium and WebKit**; the gallery group keeps its dev server and all three engines (D-14's amendment). The compose `browser` service depends on `web-prod` and `mock` | D-09, D-14, D-12, QR-22 |
| Accessibility, checked | `@axe-core/playwright` on the transactions page, and a keyboard-only pass: reach the table, sort a column with the keyboard, load the next page, open a row's details, come back | QR-12, D-09 |

**Packages this plan needs (QR-24, D-23) — asks the author before it is installed:**
- `@axe-core/playwright` 4.13.0 (published 2026-08-11, past the quarantine; Deque Systems, 5 maintainers,
  provenance, one dependency: `axe-core ~4.13.0`; peer `playwright-core`). D-09 already chose it.

**No update batch (QR-25), deliberately.** Nothing here is blocked by an old version, and moving `@playwright/test`
would move the browser engines in the image — which would shift baselines in the same work that adds new ones, so
a diff could not be read. Recorded in the log as a deviation from the "one batch at the start of a plan" habit.

## Steps

1. **Docs.** This plan.
   - Commit: `docs(plans): add plan 08, the transactions page`.
2. **The stand-in becomes a server.** `mock/server.ts`, the compose service on the existing image, Vite's
   proxy, Caddy's `reverse_proxy`. `scripts/check-headers.sh` gains two assertions: `/api/transactions`
   answers through the production form, and it is not cached.
   - Commit: `feat(mock): serve the stand-in backend behind /api (D-04)`, outside the sandbox.
3. **Sorting in the contract.** The `sort` parameter, then `bun run generate` in its own commit (QR-20).
   - Commits: `feat(contract): transactions can be sorted`; `feat(contract): regenerate the client`.
4. **The server honours it.** The handler's sort, filter and cursor with the id tiebreaker, with its tests in
   `mock/handler.test.ts`.
   - Commit: `feat(mock): the stand-in sorts, filters and pages the whole set (D-06)`.
5. **The adapter.** `transactionsInfiniteQuery`, with its integration tests over the handler in `fetch`:
   pages append, a new sort starts a new entry, a cancelled request stays cancelled.
   - Commit: `feat(api): transactions as an infinite query, one entry per filter and sort (D-06)`.
6. **The table part.** `ui/Table` with its stylesheet, story, spec and baselines in three engines.
   - Commit: `feat(ui): a Table part on React Aria, virtualised, with its baselines (D-07)`.
7. **The page and its address.** The search schema, the loader, the columns, the states.
   - Commit: `feat(app): the transactions page reads ten thousand rows through the address (D-06)`.
8. **Page tests.** The second Playwright group against `web-prod` in two engines, the axe check and the
   keyboard pass.
   - Commit: `test(app): the transactions page against the production form, with axe and a keyboard pass (QR-12)`.
9. **Wrap-up**, below. Then `CLAUDE.md` (the mock service, the page-test command, the recipe for adding a
   page that reads data) and this plan's log.
   - Commit: `docs: record plan 08`.

## Proof — each new test and gate seen failing (QR-23)

One deliberate break per *mechanism*, not per spec: if the same line makes three specs fail, breaking it once is
the proof for all three, and the log says which ones went red together.

| Test or gate | Deliberate break | Expected |
|---|---|---|
| the server sorts the whole set, not the page | sort inside the page slice, after the cursor | the spec comparing the first row under `value:desc` with the seeded dataset's largest value fails — and with it the filter-count spec, from one cause |
| a stable order | drop the id tiebreaker from the sort | paging through with a repeated key repeats one id and skips another; the "every id exactly once" spec fails |
| the cursor belongs to one question | keep the cursor when the sort changes | the spec that changes sort and re-reads page one fails |
| the four states | `MOCK_LATENCY_MS` for loading, `MOCK_FAIL_STATUS` for the error, a filter matching nothing for empty | each state's spec fails when its branch is removed |
| empty ≠ no results | show one message for both | the spec that asserts different words fails |
| loading the next page | remove the load-more sentinel | the spec that scrolls and expects row 101 fails |
| virtualisation | render every row | the spec asserting the DOM holds far fewer rows than the set fails |
| `aria-sort` | drop it from the column | the part's spec fails, in all three engines |
| sorting by keyboard | swallow Enter on the column header | the spec that presses Enter and expects the address to change fails |
| axe on the page | plant a control without a name | the axe spec fails, naming the rule |
| the stand-in behind the production form | remove Caddy's `reverse_proxy` | `check-headers.sh` fails on `/api/transactions` |

## Verification

- The full `check`, on the host and in Docker.
- `docker compose run --rm browser`: the gallery group in three engines, the page group in two, twice with
  nothing changed.
- `docker compose up` from a clean clone state: the page shows data with no other setup (C-2).
- Playwright MCP on the running app: Tab to the table, sort by keyboard, load more, open a row, come back —
  checking focus, the pointer, roles and the announcement of the sort.
- `/code-review`, and `/security-review` — this diff does touch a named surface: a new HTTP service, a proxy
  rule in Caddy and the header check.

## Out of scope

Named in D-06 as answered by the server when they are built, and not built here: sorting by several columns;
free-text search; totals and a result count; jumping to page N; selecting every row that matches a filter;
export; showing, hiding, resizing or reordering columns. Also: the details page's real data (it stays a
placeholder, reached from a row), the dashboard and settings screens, everything about the three audiences
(plan 09), performance budgets and the throttled run (D-20, plan 10), and any table feature that would need a
table-model package.

## Timebox

90 minutes. The cut order, from the bottom:
1. the keyboard-only pass beyond the table itself (it stays a manual check in the log);
2. axe on pages other than transactions;
3. the page-test group against `web-prod` — the page specs then run against the dev server, and the gap is
   recorded as a deviation from D-09 for plan 10 to close.

Steps 2 to 7 cannot be cut: without them there is no screen, and FR-7 is a must.

## What happened

*Written as the plan runs; steps 1 to 3 are done at the time of writing.*

### The gate that let a 299-character subject through

The first commit of step 2 came out with its whole opening paragraph as the subject: `git log --oneline`
printed 299 characters. The cause is a missing blank line after the subject line, and the reason it passed
the gate is that `.githooks/commit-msg` measures the **first line**, while git's `%s` is the **first
paragraph** — everything up to the first blank line. So the hook and git disagree about what a subject is,
and the hook is the one that is wrong.

Fixed in the commit (amended, unreviewed at that point). **The hole in the hook is left open** and recorded
here: closing it belongs to a plan that touches the hooks, not to this one (scope control). The fix is to
measure up to the first blank line, and to prove it with a message shaped exactly like the one that slipped
through.

### A race I diagnosed wrongly, twice

The first `docker compose up` after adding the `mock` service died with:

```
mock-1  | bun install v1.4.2
mock-1  | ENOENT: copying file docs/guides/ecosystem/astro.mdx
```

- **First diagnosis, wrong:** a bad file in `bun-types`. Measured against it: a clean container installed
  359 packages with exit 0, the file is an ordinary 1904-byte `.mdx`, no symlinks, no long paths.
- **Second diagnosis, also wrong:** two containers writing the shared `node_modules` volume at once, and
  "proven" by restarting `mock` on the populated volume, where it worked. But then a genuinely empty volume
  worked too — `Checked 424 installs (no changes) [65ms]`. An install onto nothing is never free, so the
  packages were not coming from the volume at all: a named volume inherits the image's directory contents
  on first use, and the `deps` stage had already installed them. The "proof" had proven nothing.
- **Where it rests:** the failure is **not reproduced**. The most likely story — a volume populated before
  `bun-types` existed, with a second container reading the directory while `bun install` added 368 files to
  it — fits every observation but was not tested, and is recorded as a guess, not a finding.

What is fixed is the *design*, not the diagnosis: dependencies now install in exactly one place. A one-shot
`deps` service runs `bun install`, and the `up` services wait for it to exit 0, so the order is guaranteed
by construction rather than by timing. `check` and `browser` keep their own install, because
`docker compose run` does not wait for a completed dependency (measured: `browser is missing dependency
deps`) and, being run one at a time, they cannot race.

### The blind check, and what made it see

`check-headers.sh` gained an assertion that the stand-in answers through the production form. Removing
Caddy's `reverse_proxy` left it **green**: the SPA fallback answers 200 on any path, with `no-cache`, so a
check reading only the status code could not tell the backend from `index.html`. Strengthened to read the
kind of answer — `content-type: application/json`, and a body starting `{"items":` — it fails with
`got 'text/html; charset=utf-8'` and `got '<!doctype'`, exit 1. This is the second time in two plans that a
deliberate break has found a test asserting something weaker than it appeared to (plan 07 found the first).

### The package that cost three fixes

`@types/bun` was added for one function, `Bun.serve`. The author's angle — the quarantine is a security
rule, so judge it on security — held up: no install-lifecycle script, four files shipped, no executable
code, installs run `--ignore-scripts`. And 1.4.1 turned out to be byte-identical to 1.4.2 across all 368
declaration files, so the aged version needed no exception. What it did cost:

| Break | Fix |
|---|---|
| `asFetch` claimed `typeof fetch`, which Bun's types define more fully | narrowed to `FetchLike` — the promise was never true |
| `new Request(url: URL)` has no overload in Bun's types | `new URL(...).href` |
| `MOCK_*` reads did not narrow under `exactOptionalPropertyTypes` | read each variable once |

`@types/node` stayed pinned at 24.13.4 despite `bun-types` depending on `@types/node: "*"` — checked after
the install, not assumed.

### Two rules that collided, and which one won

Step 3 could not be the two commits QR-20 asks for. The drift gate exists now, and it fails a tree whose
contract is ahead of its generated client (measured: exit 1, `src/api/generated is not what
contract/openapi.yaml generates`). So a contract-only commit cannot pass the gates that exist at that
commit — and CLAUDE.md writes that rule with no exceptions, while QR-20's concern is that a reviewer can
tell authored code from generated code. The contract and its regeneration went in one commit, with the
exact generator command in the body. Plan 04 could split them only because the gate arrived *after* the
generated code. From here on, a contract change and its regeneration are one commit.

### Reading `$?` after a pipe, twice

Twice today I mistook a pipeline's exit code for a script's. `sh scripts/check-contract.sh | tail` reported
`exit: 0` while orval was missing, and I wrote it down as a hole in the gate; run without the pipe it
returns **127**, correctly. The same mistake earlier made a deliberate break look like it had passed. The
gate is fine; the measurement was not. Where an exit code is the evidence, the command runs without a pipe.

### The tiebreaker that guarded nothing, and what it actually guards

Three deliberate breaks went into step 4. Two failed as predicted — ordering the page instead of the set,
and making `sortedFor` a no-op, each taking down the same two specs. The third **passed**, and it was the
one worth running: removing the id tiebreaker left all 72 tests green.

Measured, rather than argued: the seeded dataset holds 9 pairs of equal `value.minor` in 10 000 rows (136 in
50 000), and `occurredAt` has no ties at all. So ties exist — but `Array.prototype.sort` is stable, so equal
rows keep their input order and every request returns the same sequence. Paging the set therefore cannot see
a missing tiebreaker.

What the tiebreaker really protects is the move off this stand-in: a real server returns rows of equal value
in whatever order the database chose, and a cursor walking them repeats one row and skips another — each page
well formed on its own. The comment in `mock/handler.ts` said the stronger thing; it now says the measured
one, and `sortedFor` is exported so a test can feed the same rows in two orders and watch the tiebreaker do
that job. Without it, that test fails.

This is the third time in two plans that a deliberate break has found a test weaker than it looked: plan 07's
`aria-current` count, and here both the value comparison (which the test caught **before** any break — it
returned 1274 where 9999981 was expected, my `order` multiplier was inverted) and the tiebreaker.

### Three times I wrote an expectation from memory

"Measure, do not recall" is in CLAUDE.md about versions and sizes. This plan showed it applies to shapes
just as much, and each of these cost a failing run to find:

| What I assumed | What the measurement said |
|---|---|
| A commit body separated by a newline is enough | git's `%s` is the first *paragraph*: the subject came out 299 characters, past the 100 the hook allows — and the hook, which reads only the first line, passed it |
| A cancelled query rejects with `AbortError` | TanStack Query catches the abort and rejects with its own `CancelledError`; the transport's pass-through is what `mock/handler.test.ts` asserts |
| That error's `name` is `'CancelledError'` | `name` stays `'Error'`; only `message` names the class |

The value comparison belongs in the same list: the `order`-multiplier trick I wrote instead of a plain
comparison inverted `value:desc`, and the test caught it before any deliberate break — 1274 where 9999981
was expected.

### Plan 07's prediction came true, twice, and the compiler found it first

Plan 07's review said that once the transactions route had a search schema, a link without an explicit
`search` would lose `aria-current`. I could not reproduce it then and recorded it as **unproven**. The schema
arrived in this plan, and both halves landed:

- `tsc` refused two existing call sites the moment `validateSearch` existed — `TransactionDetailsPage` and
  `RouterLink.story` — because the router now requires `search` on a link to `/transactions`. The seam did
  the work: a type error, not a silent change. The default now lives once, in
  `TRANSACTIONS_DEFAULT_SEARCH`.
- With the links naming a sort and the story's memory route having no schema, `aria-current` went to `null`
  in all three engines — exactly the mechanism described. Giving the story's route the same schema restored
  it. The `activeOptions={{ includeSearch: false }}` insurance in `SideNav` is therefore still unproven as
  insurance, but the failure it guards against is now real and observed.

### Two things that were measuring the wrong thing

- The `browser` service had no `MOCK_URL`. It starts its own dev server inside the container, so `/api` was
  proxied to `localhost:3001` where nothing listens (`ECONNREFUSED`), and a page-level probe saw an app with
  no data. Step 2 wired `web` and `web-prod` and forgot this one; page tests in plan 10 would have hit it.
- A live probe showed sorting changing the address but not the rows, which looked like a real defect. The
  cause was a stale process: the `mock` container had been started before `sortedFor` existed, and
  `bun run mock/server.ts` does not reload. After `--force-recreate`: first row by date €74,573.75, by
  `value:asc` €12.74 (tx-05921), by `value:desc` €99,999.81 (tx-08809) — the largest in the set, matching
  the unit test's 9999981 minor units. The lesson is the same one as the exit codes: what a measurement runs
  against is part of the measurement.

### What was cut, and why

Step 8 — the second Playwright project group against `web-prod`, `@axe-core/playwright`, and the
keyboard-only pass over the whole page — is **not built**. The timebox went into steps 2 to 7, and the
author needs `ARCHITECTURE.md` (C-4) from the remaining budget. Cut deliberately, per the plan's own cut
order, and moved to plan 10. What this leaves uncovered, named rather than implied:

- no automated accessibility check on a whole page (the parts have their specs; axe was to cover the page);
- page behaviour is proven by the part's specs plus a manual browser drive recorded here, not by a spec in
  the repository — so a regression on the page itself would not fail `check`;
- the page group never ran against the production form, so D-09's "browser tests run against the production
  form" still holds only for the gallery.

The package ask for `@axe-core/playwright` therefore never happened; it moves to plan 10 with the step.

### Numbers

| What | Measured |
|---|---|
| `docker compose up` from no images and no volume | returns in 26s; app 200 and `/api` JSON at 29s |
| The production form, the same way | ready in 7s; 13 of 13 header checks green |
| The stand-in's own behaviour | 400 on `limit=0`, 404 unknown path, 503 under `MOCK_FAIL_STATUS`, 0.703s under `MOCK_LATENCY_MS=700` |
| Gates | full `check` on the host and in Docker; 66 browser tests in three engines |
