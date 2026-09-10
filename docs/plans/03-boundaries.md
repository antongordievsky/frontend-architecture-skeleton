# Plan 03 — Boundaries: page modules, zones and the layer rule

**Status:** done 2026-09-11 — GREEN LIGHT 2026-09-11 · **Timebox:** 30 min of execution
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

Executed 2026-09-11 on `build/03-boundaries`. The rule, its fixture and its gate took about 25 minutes
after GREEN LIGHT, inside the timebox; nothing was cut. The decision took longer than the code: D-16
went through three shapes before any code was written.

- *Update batch (QR-25):* `bun outdated` at the start of the plan offered nothing. Newer `@babel/core`
  and `@biomejs/biome` exist, but both are still inside the 7-day quarantine.

**Deviations and surprises**

1. *D-16 changed shape twice, both times on the author's input.*
   - The first proposal was five flat layers with pages as plain folders (spike v1, 12 of 12).
   - The author pointed to the page modules of careero and we-travel-template: a folder per screen with
     its own subfolders and an `index.ts`. Spike v2 was rebuilt around that, with zones from careero:
     14 of 14. Its first run had the right count but two wrong reasons, because a zone's root was taken
     for a shell file. Since then the reason is checked, not the count.
   - The author then asked where the generated hooks live. That exposed CC-04: "`api` has no React"
     contradicted D-24. DR-8, D-01 and D-16 were amended with the author's agreement.
2. *The risk about rule options did not happen.* `context.options` reaches a JS plugin rule in oxlint
   1.82.0: the same fixture gave different reports with `zones: ["app"]` and `["app", "admin"]`.
3. *An override replaces a rule's options; it does not merge them.* Measured on a scratch tree: with an
   override for `src/api/**`, the top-level `localStorage` ban no longer applied there. So the `api`
   override repeats plan 02's storage ban, and the proof checks it.
4. *An unknown folder was noisy.* A file in a folder outside the map was reported once for the folder
   and again for each of its imports. The rule now reports it once per file.
5. *oxlint prints two built-in rules differently.* In `--format unix`, `no-restricted-imports` prints
   its default text ("'react' import is restricted from being used."), not the configured message.
   `no-restricted-globals` prints the configured message. The config's messages still document the
   reason.
6. *`npm view` fails inside the sandbox,* because npm's cache in `~/.npm` is not writable there. The
   registry was read with `curl` instead.
7. *The rule's commit ran the Docker gate,* because `package.json` changed. Inside the sandbox it
   failed on a write to `~/.docker/buildx`, which the sandbox refuses since plan 02. It was then
   committed outside the sandbox, with the author's approval.

**Gates proven (QR-23)**

| Gate | Deliberate break | Result |
|---|---|---|
| the rule, on the fixture | the fixture test as committed | 17 of 17 expected violations reported, nothing else |
| missed violation | the rule's cross-page check disabled | exit 1: the five cross-page markers unanswered. The rule still fired on those lines with a weaker reason, and the test refused that too |
| stray marker | a marker above `main.tsx`'s allowed import | exit 1: "expected, not reported" |
| unexpected report | a `ui` → `api` import with no marker | exit 1: "reported, not expected" |
| the real tree | `src/utils/x.ts`; React in `src/domain`; `react-dom`, `document` and `localStorage` in `src/api`; React in `src/api` | exactly 5 reports; React in `api` gave none |
| the fixture out of the main lint | the `ignorePatterns` entry removed | the main lint: 19 problems, exit 1 |

**Measured**

- *Lint:* 0.04 s before the rule and 0.25 s after. Of that, oxlint with the plugin takes 0.09 s and
  the fixture test the rest.
- *CodeGraph:* 31 files indexed after the new folder.

**Versions used:** oxlint 1.82.0, Biome 2.5.12, Bun 1.4.2, Node 24.21.0.

**Reviews at wrap-up**

*`/code-review`* reported six issues. It confirmed four of them on a scratch tree built to hit each
case, and found the other two by reading the config. Five were fixed in `ee446c6` and one is recorded:

| Finding | Outcome |
|---|---|
| The src root was the *last* `/src/` in a path. A checkout inside a folder named `src` made every file outside the project's `src/` fail lint | Fixed: the root is anchored to the rule's own location through a `src` option, and paths are compared as real paths. Proven on a copy inside `…/src/proj`: the old rule flagged `vite.config.ts` and `lint/layers.js`, the new rule only the deliberate file |
| A type written as `import('…')`, `import x = require('…')` and `import()` with a template literal went unseen, so page-to-page types got through | Fixed after measuring their AST shapes on oxlint 1.82.0. A computed `import()` path cannot be checked, so it is now refused. Three fixture cases, plus one for the refusal |
| `@/app/` with a trailing slash slipped past the zone-root check, and `@/ui/Table/` was a false "private" | Fixed with `path.resolve`. Two fixture cases, one of them an allowed import |
| The shell could import a zone's internals other than pages | Fixed: a zone is entered only through its `index.ts`. One fixture case |
| `api`'s DOM ban covered only `window` and `document` | Fixed in part: `location`, `navigator` and `history` added, proven with 3 reports. `globalThis.document`, `self.document` and aliases still pass; recorded in D-16, like D-21's storage-ban gaps |
| `domain` has no DOM-globals ban in lint | Recorded: D-16 and D-01 give this to `domain`'s own DOM-free compiler settings, which arrive with its first file (plan 04) |

The committed rule, run on the new fixture, left all six new markers unanswered and gave the false
report: exit 1. The fixture now holds 23 expected violations.

*`/security-review`* found no vulnerabilities, so there was nothing for the false-positive filter to
check. It examined:
- the rule's path handling, which only compares strings;
- the fixture test's `spawnSync`: no shell, fixed arguments;
- whether the `api` override dropped the storage ban (it repeats it);
- whether the fixtures can reach the bundle (they cannot).

**Follow-ups**

- *Plan 04 must bring `domain`'s DOM-free tsconfig with its first file (D-01),* and prove it with a
  `document` in `domain` that fails typecheck. Until then, lint keeps only React out of `domain`.

- *The `@/` alias* lands with its first consumer (plan 04): TypeScript's `paths`, and Vite 8's
  `resolve.tsconfigPaths`, which is off by default.
- *Where amounts turn into `bigint`,* given that the generated hooks return strings (QR-2) — D-03.
- *The fixture test is a plain Node script* because no test runner exists yet. When D-09 brings one, it
  can move there or stay: it has no dependencies.
