# Plan 03 — Boundaries: page modules, zones and the layer rule

**Status:** in progress — GREEN LIGHT 2026-09-11 · **Timebox:** 30 min of execution
**Serves:** FR-2, DR-1 and DR-8 (their lint part), QR-7, QR-8, QR-23 · **Applies:** D-16, D-10, D-01, D-24

## Why this plan exists

Plan 02 made the machine refuse loose types, unsafe React, inaccessible markup, leaked keys and
unvetted packages. It does not yet refuse the most important thing FR-2 asks for: one part of the
product reaching into another. D-16 fixed the shape of the code:
- page modules inside actor zones, each exposing only its `index.ts`;
- shared layers grouped by role: `ui`, `api`, `domain`.

This plan turns that shape into a lint error, before the first page exists. From plan 04 on, every file
lands inside the rules.

## Approach

The rule comes before the folders it governs. Today `src/` holds only the shell (`main.tsx`, `App.tsx`,
`index.css`), and it stays that way here. The app zone, the first page modules and the `@/` alias arrive
with their first consumer in plans 04 and 05. Creating them now would be empty structure (QR-8).

So the rule is proven on a fixture: a small tree with a deliberate violation for every boundary, and
an allowed import for every legitimate path. JS plugins in oxlint are alpha and not subject to semver
(D-10). The fixture therefore stays in the repository and runs on every `check`, not only once. It
fails if the rule misses an expected violation, and it fails if the rule reports anything unexpected.

| Piece | Where |
|---|---|
| The rule, `layers/boundaries` | `lint/layers.js`: the layer map, import resolution for `@/` and relative paths |
| Its configuration | `.oxlintrc.json`: the rule with `zones: ["app"]`; the fixture ignored; React banned in `src/domain/**`; `react-dom` and the DOM globals banned in `src/api/**` (CC-04) |
| The fixture | `lint/fixtures/layers/src/**`: each violation marked `// expect: <reason>` on the line above |
| The fixture test | `lint/layers.test.mjs`: runs oxlint on the fixture and compares reports with the markers, both ways |
| The gate | `lint` runs oxlint and then the fixture test; `check` calls `lint` |

The zones are a rule option, not a constant. The real configuration lists only `app`. The fixture lists
`app` and `admin`, so that zone isolation is proven before a second zone exists. The rest of the layer
map lives in the rule, as the one source of truth.

The React bans are built-in oxlint rules. They are stable, unlike the plugin API, so they are proven
once on the real tree, like plan 02's rules, and are not part of the fixture.

## Steps

1. **Docs.**
   - D-16 marked `Accepted`, with CC-04's amendment: `api` may hold the generated TanStack Query hooks
     (D-24) and is kept free of the DOM, while `domain` is kept free of React and the DOM. DR-8 and D-01
     carry the same amendment.
   - This plan.
   - Commits: `docs(decisions): accept D-16, with api free of the DOM rather than of React` and
     `docs(plans): add plan 03, the boundaries`.
2. **The rule, its fixture and its gate** — one commit, because a rule ships with its test:
   - `lint/layers.js`, grown from the D-16 spike, with `zones` read from the rule's options;
   - `.oxlintrc.json`: `jsPlugins`, the rule, `ignorePatterns` for the fixture, and the two overrides;
   - the fixture tree, formatted, with 12 plugin violations and every allowed import from the spike;
   - `lint/layers.test.mjs`, run by `lint` right after oxlint.
   - Commit: `build(lint): enforce the D-16 boundaries with a local oxlint rule`.
3. **Docs.**
   - `CLAUDE.md`: what `lint` and `check` run, and one line about the sandbox: a merge or branch switch
     that changes `.claude/settings.json` runs outside it, because the sandbox refuses git's write
     (found at plan 02's merge).
   - This plan's log.
   - Commit: `docs: record plan 03`.

## Proof — each new gate seen failing (QR-23)

| Gate | Deliberate break | Expected |
|---|---|---|
| the rule, on the fixture | the fixture test run as committed | exit 0: every marker reported with its reason, nothing else reported |
| the fixture test catches a missed violation | the rule's cross-page check disabled | exit 1, naming the marker that went unreported |
| the fixture test catches a false report | a stray marker above an allowed import | exit 1, naming the marker that went unreported |
| the fixture test catches an unexpected report | a violation added without a marker | exit 1, naming the report nobody expected |
| the real tree: an unknown folder | `src/utils/x.ts` | `lint` exit 1: `src/utils is not a known layer` |
| the real tree: React in `domain` | `src/domain/x.ts` importing `react` | `lint` exit 1 from the built-in ban |
| the real tree: the web in `api` | `src/api/x.ts` importing `react-dom`, and reading `document` | `lint` exit 1, twice |
| `api` keeps plan 02's storage ban | the same file reading `localStorage` | `lint` exit 1: the override did not drop it |
| `api` may hold hooks | the same file importing `react` | no report |
| the fixture stays out of the main lint | the `ignorePatterns` entry removed | oxlint exit 1 on the fixture's violations |

## Verification

- A full `check` on the host and in Docker exits 0. Lint time is measured before and after the rule.
- Wrap-up per `CLAUDE.md`: built-in `/code-review` and `/security-review` on the plan's diff.

## Out of scope — and where it goes

- The app zone, page modules, `AppRouter.tsx` and the `@/` alias — with their first consumer (plans 04
  and 05).
- The public and support zones — with their first page (DR-1, DR-4, D-18).
- Where amounts turn from strings into `bigint`, given that the hooks return the wire format (QR-2) —
  D-03, plan 04.
- The "where does X go" table — `ARCHITECTURE.md`, assembled from D-16 in plan 09.
- Raw interactive elements and the UI library outside `ui` (FR-5) — plan 06, D-07.

## Risks watched during execution

- *Rule options in an alpha API.* If `context.options` does not reach a JS plugin rule, the zones move
  into the rule's map, with `admin` declared for the fixture, and the deviation is recorded.
- *Overrides replace, they do not merge.* If an override's `no-restricted-globals` replaces the
  top-level one, the `api` override repeats plan 02's storage ban. The proof table checks it.
- *Lint time.* JS plugins run outside oxlint's native core. If lint gets noticeably slower, measure it
  and record the figure; D-25's "wrong if" is about 10 s for pre-commit.
- *A second config for the fixture* could drift from the real one. The zones are the only difference,
  and that difference is deliberate.
- *The timebox.* The cut order: the fixture's stray-report check goes first; the rule and the fixture's
  missed-violation check stay.

## What happened

*(filled at wrap-up)*

- *Update batch (QR-25):* `bun outdated` at the start of the plan offered nothing. Newer `@babel/core`
  and `@biomejs/biome` exist, but both are still inside the 7-day quarantine.
