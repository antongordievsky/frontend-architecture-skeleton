# Plan 08 — The transactions page: ten thousand rows, answered by the server

**Status:** draft — awaiting GREEN LIGHT · **Timebox:** 90 min of execution
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
