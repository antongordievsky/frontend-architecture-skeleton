# Plan 05 — Routing, the shell and the error states

**Status:** done 2026-09-11 — GREEN LIGHT 2026-09-11 · **Timebox:** 60 min of execution
**Serves:** FR-4, QR-3, QR-4, QR-11, QR-17, QR-20, QR-23, QR-25, DR-1 (the public zone's first page), DR-2 (the
reaction to a 401), DR-3 (a place for the guard) · **Applies:** D-05, D-18, D-17 (amended), D-16 (amended
below), D-03, D-09, D-23

## Why this plan exists

The app is one static page. This plan gives it addresses:
- the dashboard, transactions with a transaction's details, settings, and not found (FR-4);
- a sign-in page in the public zone, the first page of a second zone.

It also gives it what D-18 asked for. Every failure shows a clear, standard state, and a 401 sends the user to
sign in with the address to return to. No screen loads data yet: the stand-in server, the proxy and the first
data screen are plan 07's. So the API-driven states are proven here by tests over the stand-in handler, and
seen live in plan 07.

## Approach

| Piece | Where | Decision |
|---|---|---|
| The router | `@tanstack/react-router`, file-based. `src/router.ts` creates it with the query client in its typed context, `defaultErrorComponent` and `defaultNotFoundComponent`, and registers its type | D-05 |
| Route files | `src/routes/`, thin: a path, a search schema, the page from its zone's `index.ts`. `__root.tsx`; `_app.tsx`, the app zone's pathless layout; `_app/index.tsx` (dashboard), `_app/transactions.index.tsx`, `_app/transactions.$transactionId.tsx`, `_app/settings.tsx`; `sign-in.tsx` | D-05, D-16, D-18 |
| The generated tree | `src/routeTree.gen.ts`, written by the Vite plugin in dev and build, and by `tsr generate`, from one `tsr.config.json`. Committed, skipped by Biome | D-05, QR-20 |
| Drift gate | `scripts/check-routes.sh`: `tsr generate` into a scratch copy under `node_modules/.cache`, then compare, as the contract's gate does | D-05, QR-23 |
| Zones and pages | `src/app/`: `AppLayout` (navigation, `<Outlet />`) and the pages `Dashboard`, `Transactions` with `Details` as its sub-page, and `Settings`. `src/public/`: the `SignIn` page. Stubs, in plain semantic HTML: the UI kit is plan 06's | D-16 |
| Typed parameters | the route parameter `$transactionId`; the search parameter `redirect` on `/sign-in`, a `zod/mini` schema with `catch` that accepts only a path on this site (`/…`, never `//…` or `/\…`) and falls back to `/` | FR-4, QR-11 |
| Error states | `src/components/ErrorScreen/`: `describeError(error)` turns any error into a title, a line of explanation and one action. 401 means the session ended (sign in), 403 no access, 404 or an unknown address not found (go to the dashboard), 5xx or a network failure an error with a retry, and a contract error or anything else an error with a retry. No financial data or PII in the text | D-18, D-03 |
| The reaction to a 401 | `createQueryClient({ onUnauthorized })`: the query cache signals any 401, and only a 401. The shell answers: it clears the cache, then navigates to `/sign-in` with the current address as `redirect`, replacing the history entry, unless the user is already there | D-17 (amended), D-18 |
| Boundaries | lint: `src/routes/` belongs to the shell; `public` joins the zones; fixture cases for each | D-16 |

**D-16, amended — agreed with this plan's GREEN LIGHT.** D-16 draws the shell as `main.tsx` and
`AppRouter.tsx`. D-05 moved the route tree into files. The note reads:

> *Amended 2026-09-11 by D-05, agreed with plan 05:* the shell is `main.tsx`, `router.ts`, the route files in
> `routes/` and the generated `routeTree.gen.ts`. There is no `AppRouter.tsx`. A route file reaches a zone
> only through its `index.ts`, as any shell file does.

## Steps

1. **Docs.** The D-16 amendment and this plan.
   - Commits: `docs(decisions): amend D-16, the shell's routes live in files (D-05)` and
     `docs(plans): add plan 05, routing and the error states`.
2. **Update batch (QR-25).** `bun outdated`, then `bun update <names>` for what has passed the quarantine,
   with majors one at a time and their changelogs read. One commit through `check`, if anything moves.
   - orval's exclusions stay. Plan 04 said to remove them here, but 8.31.0 was published 2026-09-10 and
     passes the quarantine on 2026-09-17. `bunfig.toml`'s comment gets that date instead.
3. **Packages** (D-23), each verified in the registry first: publisher, provenance, no install scripts.
   - `@tanstack/react-router` 1.170.32, the newest past the quarantine.
   - Development: `@tanstack/router-plugin` 1.168.35, and `@tanstack/router-cli` 1.167.33. 1.167.33 is the
     plugin's own generator version (`@tanstack/router-generator` 1.167.33), so the gate and the build
     generate the same tree.
   - Commit: `build(deps): add TanStack Router, its Vite plugin and its CLI`. The Docker gate runs, so the
     commit is made outside the sandbox, with the author's approval.
4. **Boundaries.**
   - The layer rule counts `src/routes/**` as the shell, and `.oxlintrc.json` gains the `public` zone.
   - Fixture cases:
     - a route file importing a zone's `index.ts` passes;
     - a route file reaching a page past its zone's `index.ts` is refused;
     - a page importing a route file is refused.
   - Commit: `build(lint): route files belong to the shell, and the public zone joins the map`.
5. **The router, the shell and the routes.**
   - `tsr.config.json`: the routes folder, the tree's path, single quotes, no semicolons, and test files
     ignored.
   - The plugin goes before `@vitejs/plugin-react`, with `autoCodeSplitting`.
   - `router.ts`, and `main.tsx` with `QueryClientProvider` and `RouterProvider`.
   - The route files, the zones' `index.ts` files and the page stubs, and the `routes` script.
   - The generated tree, with the exact command in the commit body.
   - Commit: `feat(app): the router, the shell and the first routes (D-05)`. The tree and the route files
     share a commit, because `typecheck` refuses either without the other, as in plan 04a.
6. **Drift gate.** `scripts/check-routes.sh`, and `check` runs it after the contract's gate.
   - Commit: `build(routes): fail check when the route tree drifts from the route files`, outside the
     sandbox (`package.json`).
7. **Error states and the reaction to a 401**, with their tests.
   - `ErrorScreen` and `describeError`, set as the router's defaults.
   - The query cache's 401 signal.
   - The shell's `endSession`.
   - The sign-in page's `redirect` schema.
   - Commit: `feat(app): clear error states, and back to sign-in when the session ends (D-18)`.
8. **Wrap-up**, below. Then `CLAUDE.md` (the `routes` command, the gate in `check`'s order, the "add a page"
   steps) and this plan's log.
   - Commit: `docs: record plan 05`.

## Proof — each new test and gate seen failing (QR-23)

| Test or gate | Deliberate break | Expected |
|---|---|---|
| typed links | a navigation link to `/transaction` | `typecheck` fails on the link |
| the typed route parameter | the details page reads `params.id` | `typecheck` fails |
| `redirect` accepts only a path on this site | the path check removed from the schema | the tests for `//evil.example`, `/\evil.example` and `https://evil.example` fail |
| `describeError` | 403 mapped to the generic error | the 403 test fails |
| the 401 signal | the signal also fires on 403, then the signal is removed | the 403 test fails, then the 401 test fails; both run over the stand-in handler's `failStatus` |
| `endSession` | the cache left uncleared, then the `redirect` dropped | the cache test fails, then the return-address test fails |
| the drift gate | a route file added without regenerating | `check-routes.sh` exits 1, naming the tree |
| routes in the shell | the `routes` mapping removed from the rule | the fixture test fails: "src/routes is not a known layer" |
| a route past a zone's `index.ts` | the fixture case | reported with its reason, and silence for the allowed import |

`endSession` is tested with a real router over memory history, in Node, with nothing rendered (D-09). If the
router will not load its routes in Node, the test covers the pure target (`/sign-in` plus the return
address), and the flow moves to plan 07's Playwright tests. That goes in the log.

## Verification

- The full `check`, on the host and in Docker.
- `bun run routes` twice gives no diff.
- `vite build` puts each page in its own chunk. This is D-05's "Wrong if": if the pages behind a zone's
  `index.ts` land in one chunk, the zone's `index.ts` switches to lazy wrappers and automatic splitting goes
  off. The chunk list goes in the log.
- The bundle holds none of the stand-in's strings.
- Playwright MCP on the dev server (a UI plan):
  - every route by its address;
  - the navigation by Tab, with visible focus;
  - an unknown address shows not found;
  - `/sign-in?redirect=//evil.example` falls back to `/`;
  - the details page shows its parameter.
  - The API-driven states are not visible until plan 07's server, and the log says so.
- The production form, with `docker compose --profile prod up`:
  - `scripts/check-headers.sh` passes;
  - a deep link such as `/transactions/tx-1` loads, through Caddy's fallback;
  - the console reports no CSP violation.
- `/code-review` and `/security-review` on the plan's diff.

## Out of scope

- Loading data, the stand-in server, the proxy, and the transactions page's filters in the address (plan 07,
  D-06).
- `/me`, sign-out, the CSRF header, the button to the backend's sign-in, the guard, `Permission` and `can()`
  (D-17, D-18, with the first real sign-in and the support zone). The sign-in stub shows the address it will
  return to. The backend must validate that address as well, since the frontend's check is bypassable (D-18).
- The same 401 signal on the mutation cache: there is no mutation yet. It arrives with the first one,
  together with the CSRF header.
- UI primitives, tokens and the raw-element lint (plan 06). The stubs use plain HTML until then.
- A title per page and focus moved on navigation. They come with plan 07's accessibility pass (QR-12).
- Static or server rendering for the public zone (DR-1, D-05's growth path).

## Timebox

60 minutes. If it runs over, cut in this order and record the cut:
1. the `endSession` router test falls back to the pure target, and the flow moves to plan 07;
2. the production-form pass moves to plan 07's wrap-up.

The gates and the error states are not cut.

## What happened

Executed 2026-09-11 on `build/05-routing`, from 14:48 to 15:14 by the hooks' timestamps, then the
wrap-up. It stayed inside the timebox, and nothing was cut. Ten commits:
- `1c89cfd` the D-16 amendment;
- `a454f3c` this plan;
- `b74caed` the packages (`bun add @tanstack/react-router`, then
  `bun add -d @tanstack/router-plugin @tanstack/router-cli@1.167.33`);
- `6570d45` routes in the shell (lint);
- `17d51cc` the router, the shell and the routes, with the tree from `mise exec -- bun run routes`
  (`tsr generate`, `@tanstack/router-cli` 1.167.33);
- `5f2d804` CC-07;
- `b0dc261` the route drift gate;
- `83a6bd4` the error states and the reaction to a 401;
- `e376cdc` the browser pass's fix;
- `5e3e4a9` the reviews' two fixes.

**Deviations and surprises**

- *The update batch was empty.* `bun outdated` offered nothing past the quarantine: zod, `@babel/core` and
  Biome have newer versions inside it. orval's exclusions stay. 8.31.0 was published 2026-09-10 and ages
  on 2026-09-17, so plan 04's "remove at plan 05" came too early, and `bunfig.toml`'s comment now carries
  the date.
- *`public` joined the zones in step 5, with its first page, as D-16 says,* rather than in step 4.
- *Automatic code splitting kept the whole app zone in one chunk (CC-07).* This is D-05's "Wrong if",
  measured.
  - Each route's chunk (0.09 kB) only re-exported its page from one 2.08 kB chunk that held every page.
  - `"sideEffects": ["**/*.css"]` in `package.json` fixed it. Now each page is its own chunk:
    dashboard 0.41 kB, settings 0.40 kB, transactions 0.37 kB, details 0.72 kB, the layout 0.74 kB,
    sign-in 0.66 kB.
  - This replaced the lazy wrappers the "Wrong if" had planned, and D-05 stands as decided.
  - The cost is in CC-07: a module imported for its side effect is now dropped silently.
- *The entry chunk grew.*
  - Before the router: 220.09 kB (68.85 kB gzip).
  - With the router: 316.51 kB (100.22 kB gzip).
  - With the error states and `zod/mini` in the sign-in route's schema: 333.93 kB (106.09 kB gzip).
  - Plan 08's budget sets the number.
- *In Node, a load commits no matches when the validated search differs from the address.*
  - With `//evil.example` as `redirect`, `router.load()` resolved with no matches and no navigation
    event, while `matchRoutes` gave the right `{ redirect: '/' }`.
  - In the browser, the app rewrites the address to the validated one (`/sign-in?redirect=%2F`), so this
    happens only without `RouterProvider`.
  - The return-address tests use `matchRoutes` through the real route tree.
- *The router writes a default into the address:* `/sign-in` becomes `/sign-in?redirect=%2F`.
- *A test that could not fail, caught while planning its proof.* The first "already on the sign-in page"
  test read the state before the asynchronous navigation had settled, so it would have passed without
  the guard. `endSession` now returns the navigation, and the tests await it.
- *`tsr generate` prints a Node warning on every run:* "Accessing non-existent property
  'replaceRouteChunk' of module exports inside circular dependency". The output was identical across
  runs.
- *`check` failed twice on formatting of new files,* a wrapped line and `package.json`'s new array.
  `bun run format` fixed both.
- *The Playwright MCP server was not connected in this session.* It is in `.mcp.json`, but no tools were
  offered.
  - The browser pass ran as a script instead, on the installed `playwright` 1.63.0-alpha (from
    `@playwright/mcp`), with the cached Chromium headless shell build 1234.
  - The installed core wanted build 1243, which is not downloaded. `npx playwright install` was not run
    without the author's go.
- *The sandbox cannot reach the published port 8080.* The headers test and the browser pass ran outside
  it.

**Proof (QR-23)** — every row seen failing, then restored:

| Test or gate | Break | Seen |
|---|---|---|
| routes belong to the shell | the `routes` mapping removed from the rule | "src/routes is not a known layer", and both expected reports missing |
| a route past a zone's `index.ts`; a page importing a route file | fixture cases | reported with their reasons, 28 of 28, and silence for the allowed imports |
| typed links | a navigation link to `/transaction` | TS2820 "… Did you mean '"/transactions"'?" |
| the typed route parameter | the details page reads `id` | TS2339 "Property 'id' does not exist on type '{ transactionId: string; }'" |
| the route drift gate | a route file added without regenerating | exit 1, with `AppReportsRoute` in the diff |
| the route drift gate | `settings.tsx`'s path changed to `/_app/setting` | exit 1, with the generator restoring `/_app/settings` |
| `redirect` accepts only a path on this site | the path check removed | the four hostile addresses fail |
| `describeError` | 403 mapped to the generic error | "a 403: no access" fails |
| never the server's words (QR-10) | the response body put into the message | the QR-10 test fails |
| the 401 signal | the signal also fires on 403; then the signal removed | "a 403 does not" fails; then "a 401 … raises it once" fails |
| `endSession` | the cache left uncleared; the return address dropped; the already-on-sign-in guard removed | each of the three tests fails in turn |
| the back link is not the current page | the fix absent (before `e376cdc`) | the browser pass saw `aria-current` on the back link as well as on the section link |
| no control character in `redirect` | the old pattern, `^\/(?![/\\])` | the tab, line-feed and carriage-return cases fail |
| `endSession` clears the router's cache | `router.clearCache()` removed | "clears the router's cache too" fails |

**Verification**

- The full `check` passed on the host at every commit, through pre-commit: 64 tests at the end, 28 fixture
  violations, both drift gates, no leaks, and `bun audit` clean at 413 packages. The Docker gate passed at
  `b74caed`, `17d51cc` and `b0dc261`.
- `bun run routes` twice gives the same tree.
- The bundle holds none of the stand-in's strings: 0 of 9 files.
- The production form (`docker compose --profile prod up`):
  - `scripts/check-headers.sh` passed all 10 checks, the CSP on the entry and on a client route
    included;
  - `/transactions/tx-1`, `/sign-in` and `/nope` load the app through Caddy's fallback.
- The browser pass on the production form:
  - every route shows its heading, and the current navigation link carries `aria-current="page"`;
  - `/nope` shows "Page not found" with a link to the dashboard;
  - `//evil.example` and `https://evil.example` as `redirect` become `/sign-in?redirect=%2F`, and the
    page says it returns to `/`;
  - Tab reaches Dashboard, Transactions and Settings with a visible focus ring and the pointer cursor;
  - 0 console errors, so no CSP violation.
  - It found one defect: on `/transactions/tx-1` the back link also carried `aria-current="page"`. It was
    fixed in `e376cdc` and seen fixed.
  - Noted, not changed: the navigation's "Transactions" link is current on a transaction's details, as
    its section. That goes to plan 06's and plan 07's accessibility pass, with a skip link.
- Not seen live: the API-driven states, until plan 07's stand-in server. Tests cover them in Node.

**Reviews at wrap-up**

- `/code-review` found two things, and both are fixed in `5e3e4a9`.
  1. *Medium — the return address let other sites through.* The check looked only at the second
     character. A browser deletes tabs and line breaks from a URL, so these three passed the check and
     read as `//evil.example`:
     - `/<tab>/evil.example`;
     - `/<LF>/evil.example`;
     - `/<CR>\evil.example`.

     The reviewer confirmed it in Node, with `new URL`. Nothing navigates to the value yet, but the
     plan's claim was false. The pattern now refuses any control character (`\P{Cc}`), and the three
     cases are tests.
  2. *Low — `endSession` cleared the query cache, not the router's.* The router keeps what recent and
     preloaded loaders returned. No route has a loader yet. `endSession` now calls `router.clearCache()`
     as well, so its comment holds. Plan 07's first loader should also consider
     `defaultPreloadStaleTime: 0`, which TanStack recommends when an external cache owns the data.
  - The reviewer also checked these and found no problem:
    - the `routes` mapping and its fixtures;
    - the drift gate;
    - `sideEffects`: no module is imported only for its side effect;
    - the closure between the query client and the router in `main.tsx`;
    - several 401s arriving together;
    - every branch of `describeError`;
    - the CLI's and the plugin's shared generator, 1.167.33.
- `/security-review` found nothing above its bar. It checked:
  - that nothing navigates to `redirect`;
  - that no server text reaches the page;
  - that the cache is cleared on a 401;
  - that the session model is unchanged;
  - that the scripts take no outside input.

  One note fell below its bar: the same control-character gap, found independently. It is fixed with
  the finding above.
