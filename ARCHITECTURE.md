# Architecture

A frontend skeleton for a crypto-tax product. This is the one-page summary. The long version — every
decision with the options it beat, its evidence, and the condition that would make it wrong — is
[`docs/requirements-and-analysis.md`](docs/requirements-and-analysis.md); where a section names an ID, that
entry is the authority. [`docs/plans/`](docs/plans/) records how each slice actually went.

## The shape

One Vite application, one contract, one design system, three actor zones inside `src/`:

`routes/` the shell — a path, a search schema, the page from its zone · `public/`, `app/`, `admin/` the
zones, isolated from each other · `components/` composites that know the product, not a screen · `ui/` the
design system, no product knowledge · `api/` the one exit to the network · `domain/` money and transactions
as plain data, free of React and the DOM · `mock/` the stand-in backend, unreachable from `src/`.

Imports run one way, and that is **enforced, not documented**: `lint/layers.js` resolves every import and
fails on an upward or sideways one (D-16). A new top-level folder fails lint until its row is added, and
the rule has its own test over 33 expected violations, so a rule that stopped matching would fail `check`
rather than pass quietly.

Where does X go? A page → `src/<zone>/pages/<Name>/`. A composite → `components/`. A primitive →
`ui/<Name>/`. A server resource → an adapter in `api/`. A domain type → `domain/`.

## The seams

**The contract owns every server type** (D-03, D-24). `contract/openapi.yaml` is the source; orval writes
types, Zod schemas and calls into `api/generated`, private to `api/` by lint and never hand-edited. A drift
gate fails `check` when the two disagree, so a contract change breaks compilation at the call sites instead
of at runtime.

**One exit to the network** (D-03, D-17). `api/transport.ts` owns the base URL (`/api`, same-origin, so the
session cookie never leaves the site), the credentials policy and one error shape. Each adapter validates
the response against the contract's schema and returns domain types, so the cache holds what screens use.

**Money is never a float** (D-08). Crypto amounts are integer base units carrying the asset's decimals;
fiat amounts are integer minor units carrying their own exponent, because currency tables disagree about it
(CC-06). Parsed once at the boundary, formatted only at render. Mixing two assets fails to compile — shown
by a type-level test.

**State has three homes** (D-06). Server data in TanStack Query, keyed by the question. The question — the
filter and the order — in the address, validated by the route's search schema, so a shared link shows the
same rows. Client state local. The rule that keeps it honest: nothing is computed from the pages already
loaded, because the first hundred rows sorted by value are not the hundred largest. Sorting and filtering
are the server's work.

**The design system is the only place with a look** (D-07, D-28). Parts wrap React Aria — only `ui/` may
import it — and style themselves through its `data-*` states, with a pointer and a keyboard focus ring by
default. Every colour and size is a token in `ui/tokens.css`, and `scripts/check-tokens.mjs` refuses a raw
colour anywhere else. Raw `button`, `input`, `a` and friends are lint errors outside `ui/`. One theme.

**Auth is a seam, not a feature** (D-17, D-18). The browser never holds a token — storing one is a lint
error. The session is a typed query, the transport is the one place a 401 is answered, and screens are
gated on permissions rather than role names, so a new role needs no frontend release.

## What stops erosion

`check` runs format → lint (plus the boundary rule's own test) → tokens → contract drift → route drift →
typecheck → tests → build → secret scan → audit, on the host or in Docker. Hooks run it per commit, and
again in Docker before a push with the browser suite and the production-headers test.

Two rules carry the rest. **A commit passes every gate existing at that commit** — no exceptions, which is
why a contract change and its regeneration are now one commit. And **nothing is trusted until it has been
seen failing** (QR-23): every test and gate is proven by a deliberate break, recorded in the plan's log.
That has caught three tests asserting less than they appeared to — an `aria-current` count that never named
which row should be current, an id tiebreaker whose removal changed nothing observable, and a header check
that a removed proxy left green because the SPA fallback also answers 200.

Controls no tool enforces, named rather than assumed: a container the agent starts still reaches the tree
and the network (D-26, deferred), and `SideNav`'s `activeOptions` insurance has no test proving it.

## Testing and performance

Logic is `*.test.ts` beside the code, in Node, with no simulated page; anything that renders is
Playwright's (D-09, D-14). A part's states are stories, screenshot-compared with zero tolerance in three
engines; pages and flows run in two. The stand-in is plugged into `fetch` for integration tests and served
over HTTP for the browser. Today: 77 tests in Node, 87 in the browser.

Ten thousand rows reach the DOM a screenful at a time through React Aria's virtualiser — measured, 17 rows
rendered of 10 000, with the scroll content covering the whole set. Pages of 100 rows are 21 kB on the
wire. Each route is its own chunk, which required declaring `sideEffects` to actually happen (CC-07). The
build is 392.58 kB, 124.39 kB gzipped, of which the transactions route is 215.34 kB / 62.20 kB.

## Security

Closed by tools wherever one exists (D-21, D-23). No secret in the repository — a scanner in the hook and
in `check`; `.env*` ignored and unreadable by the agent; `VITE_*` treated as public. A CSP on the
production form, asserted by a test that also covers the cache rules, written after a review found a
missing asset cached as HTML for a year. Frozen installs, an audit in `check`, and a seven-day quarantine
on new versions whose own gaps were closed once found (CC-02, CC-08).

## Skipped, and what comes next

| Not built | Why | What it needs |
|---|---|---|
| Three-audience flows: session, sign-up, the support zone (D-30) | the timebox went to the table and the look | a session in the stand-in, one `can()`, one guard, three journeys |
| Page-level axe and a keyboard pass over the transactions page | cut for that page's budget | `@axe-core/playwright`, a second Playwright group against `web-prod` |
| Throttled performance test and bundle budget (QR-9) | partial, by the author's decision | budgets in `check`, one throttled run of the 10 000-row screen |
| CI/CD (DR-9) | no PR flow here; the local `check` is the gate | the same commands per push, plus agent reviewers as gates |
| A real backend, tax calculation, imports, charts, i18n, hosting | out of scope by decision | each is a service away; the contract is the seam |

Said plainly: the transactions page has no spec of its own in the repository. Its parts do, and its
behaviour was driven in a browser and recorded in
[`docs/plans/08-transactions-page.md`](docs/plans/08-transactions-page.md) — so a regression on the page
itself would not fail `check` today. That is the first thing to close.

## Where the reasoning changed

Ten assumptions were overturned by evidence, and the chain is kept rather than tidied away (Part II §
Course corrections): an unmaintained generator (CC-01), a quarantine a warm cache walked through (CC-02), a
server layer assumed free of React (CC-04), a currency's minor digits assumed universal (CC-06), code
splitting assumed automatic (CC-07), styles a package injected that reading its code did not reveal
(CC-09), a router link and a kit link assumed to cooperate (CC-10). The latest came from this page's own
subject: `system-ui` resolved to a CJK font inside the test image, so every screenshot baseline had been
photographing a font no user would ever see.
