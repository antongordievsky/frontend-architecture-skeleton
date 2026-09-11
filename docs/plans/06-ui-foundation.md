# Plan 06 — The UI foundation: tokens, the first parts, and the gallery that tests them

**Status:** in progress — GREEN LIGHT 2026-09-11 · **Timebox:** 90 min of execution
**Serves:** FR-5, QR-7, QR-11, QR-12, QR-17, QR-20, QR-22, QR-23, QR-24, QR-25, DR-1 · **Applies:** D-07, D-28, D-14,
D-09 (settled below), D-16, D-21, D-23, D-12

## Why this plan exists

The screens are unstyled HTML. Plan 07 builds the transactions page, and the pages are made of parts. This plan gives
them three things:
- the design's decisions, as tokens in one file, with a light and a dark theme (D-28);
- the first parts, with their behaviour from React Aria (D-07);
- a gallery where each part is tested, and compared pixel by pixel, in three engines (D-14).

Only what today's screens use is built (QR-8):
- a button, for the error screen's "Try again";
- a link, for the navigation, the error screen and the details page's way back.

The table, fields and dialogs arrive with the screens that use them.

## Approach

| Piece | Where | Decision |
|---|---|---|
| Tokens | `src/ui/tokens.css`, the only file allowed a raw colour or a custom property's definition. It has three tiers: raw (palette, spacing, radius, type), meaning (surface, text, accent, positive, negative, focus, border) and a part's own where needed. The dark theme is the meaning tier again, under `[data-theme='dark']`, and under `prefers-color-scheme: dark` unless `[data-theme='light']` says otherwise | D-28 |
| Base styles | `src/ui/base.css`: the page's font and colours from tokens, and the rule React Aria would otherwise insert (below). `src/index.css`, the placeholder, is removed | D-28 |
| The token gate | `scripts/check-tokens.mjs`, Node, no package, run in `check` after lint. Outside `tokens.css` it refuses: a hex colour; a colour function over literal values; a bare colour name in a colour property (only `transparent`, `currentcolor` and the CSS-wide keywords pass); a custom property defined anywhere else; a `var(--…)` that `tokens.css` does not define. Each failure names the file and line | D-28, FR-5, QR-7 |
| Browsers | Vite's `build.target` and `build.cssTarget`, written out rather than left to the default: Chrome 111, Edge 111, Firefox 114, Safari 16.4, iOS 16.4 (Vite 8.3.0's `baseline-widely-available`, read from its source). One list, for scripts and stylesheets | QR-22, D-28 |
| Parts | `src/ui/Button/` and `src/ui/Link/`. Each wraps React Aria and has its own `*.module.css`, styled through `[data-hovered]`, `[data-pressed]`, `[data-focus-visible]`, `[data-disabled]` and `[aria-current]`. Its base style carries the pointer cursor and a visible focus ring | D-07, D-28, QR-12 |
| Typed links | `src/components/RouterLink/`: TanStack Router's `createLink` around `ui/Link`, the integration its custom-link guide documents for React Aria. Links in product code keep their typed `to`, and `ui` stays free of the router, so the kit can leave the app (DR-1) | D-05, D-16 |
| React Aria and the CSP | `usePress` inserts one `<style>` unless an element with the id `react-aria-pressable-style` exists (read in `react-aria` 1.21.0's `usePress`). `index.html` carries an empty element with that id, and `base.css` ships the rule itself: `[data-react-aria-pressable] { touch-action: pan-x pan-y pinch-zoom }`. So the production CSP refuses nothing. If the element does not survive the build, the one refusal is recorded instead, as D-07 allows | D-07, D-21, QR-11 |
| Stories | `<Name>.story.tsx` beside each part, one export per state. Each state that matters for the look has a light and a dark story | D-14 |
| The gallery | `playwright/gallery/index.html` and `main.tsx`, served by our Vite dev server. It follows Playwright's gallery spec: it finds stories with `import.meta.glob`, renders one into `#root` and reuses the root, and a mount of an unknown story or a render error fails. It imports `tokens.css` and `base.css` as `main.tsx` does. `vite build` never sees it, and the build output is checked for that | D-14, QR-11 |
| Component tests and screenshots | `<Name>.spec.ts` beside the story, in `@playwright/test`. `playwright.config.ts` has one project per engine (Chromium, WebKit, Firefox) against the gallery. `toHaveScreenshot` runs with zero tolerance, and baselines sit beside the part in `__screenshots__/`, named per engine and platform | D-14, D-09, QR-12, QR-22 |
| Where they run | a `browser` target in the `Dockerfile`, on Microsoft's image pinned by digest (`v1.62.1-noble`). It uses our Node 24.21.0 and Bun from the base stage, so the dev server runs on the pinned runtime, not the image's 24.18.1. A `browser` service in compose's `tools` profile: `docker compose run --rm browser`, plus `--update-snapshots` to rewrite baselines on purpose | D-14, D-09, C-2, QR-13 |
| Lint | `react/forbid-elements` refuses raw `a`, `button`, `input`, `select`, `textarea` and `dialog` outside `src/ui/`. Stories are exempt, for Playwright's hidden recording inputs. Product code may not import `react-aria-components`, `react-aria`, `react-stately` or their scoped packages, nor `Link` from the router (only `RouterLink` does), nor a `*.story` file. These use `no-restricted-imports`, if oxlint merges the overrides for `domain` and `api` rather than replacing them; that is measured on the fixture first. Otherwise they go in the layers rule, with fixture cases | FR-5, D-07, D-16, QR-11 |

**D-09, settled — agreed with this plan's GREEN LIGHT.** D-09 left one point to the first part: whether component
tests run in pre-commit or only in the browser profile. The note reads:

> *Settled 2026-09-11 with plan 06:* component tests and screenshots run in the `browser` service, on Microsoft's
> image (`docker compose run --rm browser`). Pre-push runs them after `check`. Pre-commit does not: `check`'s image
> has no browsers, and the agent's sandbox cannot start Docker on every commit. The orchestrator runs them before
> each commit that changes a part, a story or a stylesheet, and the plan's log records it. Plan 07 adds the page
> tests to the same service.

## Steps

1. **Docs.** This plan, and the D-09 note.
   - Commit: `docs(plans): add plan 06, the UI foundation`.
2. **Update batch (QR-25).**
   - `NODE_USE_ENV_PROXY=1 mise exec -- node scripts/check-lockfile-age.mjs --all`: CC-08's 51 young versions are
     expected, until 2026-09-17.
   - `bun outdated`, then `bun update <names>` for what has passed the quarantine, with majors one at a time and
     their changelogs read.
   - One commit through `check`, if anything moves. It goes outside the sandbox, with the author's approval.
3. **Packages** (D-23), each verified in the registry first: publisher, provenance, install scripts, dependencies.
   - `react-aria-components`: the newest past the quarantine. That is 1.21.1 from 2026-09-11 19:21 UTC; 1.21.0
     before then.
   - Development: `@playwright/test` 1.62.1, the version of the image already chosen (D-09). 1.63.0 passes the
     quarantine at 22:44 UTC today, and moves together with the image in plan 07's batch.
   - Commit: `build(deps): add React Aria Components and Playwright Test`, outside the sandbox.
4. **Tokens, themes and the gate.**
   - `tokens.css`, `base.css`, the explicit browser list, and `main.tsx` importing the two stylesheets.
   - `check-tokens.mjs`, run in `check`.
   - The tree passes the gate in the same commit.
   - Commit: `feat(ui): design tokens, two themes, and a gate that keeps every colour in the tokens (D-28)`,
     outside the sandbox (`package.json`).
5. **The gallery and the browser service.**
   - The `Dockerfile` target, the compose service, `playwright.config.ts` and the gallery.
   - A spec for the gallery's contract: an unknown story fails the mount.
   - Pre-push runs the service.
   - Commit: `build(test): component tests and screenshots in three engines, through Playwright's gallery (D-14)`,
     outside the sandbox (the `Dockerfile` and compose).
6. **The parts.**
   - `ui/Button`, `ui/Link` and `components/RouterLink`.
   - Their stories, specs and baselines.
   - The CSP element in `index.html`, and the pressable rule in `base.css`.
   - Commit: `feat(ui): Button and Link on React Aria, with their stories and baselines (D-07)`.
7. **The screens use the parts.**
   - The shell's navigation, the error screen and the details page's link.
   - The app zone's layout in its own module stylesheet.
   - Commit: `feat(app): the shell and the error screen are built from the parts`.
8. **Lint.** The rules above land once the tree already obeys them, with a fixture case for each boundary.
   - Commit: `build(lint): raw controls, the kit's library and the router's Link stay behind the parts (FR-5)`.
9. **Wrap-up**, below. Then:
   - `CLAUDE.md`: the browser command, rewriting baselines, the pre-push line, and the recipe for adding a part
     (QR-17);
   - this plan's log.
   - Commit: `docs: record plan 06`.

## Proof — each new test and gate seen failing (QR-23)

| Test or gate | Deliberate break | Expected |
|---|---|---|
| token gate: raw colour | `#1d4ed8` in `Button.module.css` | `check-tokens` exits 1, naming the file and line |
| token gate: unknown token | `var(--color-acent)` | exits 1: not defined in `tokens.css` |
| token gate: a second source | `--button-bg: …` defined in a part's stylesheet | exits 1 |
| token gate: named colour | `color: red` | exits 1 |
| the gallery's contract | the gallery falls back to a default story for an unknown id | the unknown-story spec fails |
| Button presses | the story's recorded press count; `onPress` not passed through to React Aria | the press spec fails |
| focus ring and cursor | the `[data-focus-visible]` outline removed, then the cursor | the focused screenshot fails in each engine, then the cursor assertion fails |
| a token change reaches every part | `--accent` moved by one unit | every light Button and Link screenshot fails, and no dark one does |
| `RouterLink` marks the current page | `aria-current` not passed through to React Aria | the current-page spec fails |
| raw controls outside `ui` | a raw `<button>` in `ErrorScreen` | lint fails; the same element in `ui/Button` passes |
| the kit's library outside `ui` | a page imports `react-aria-components` | lint fails, with the rule's message |
| the router's `Link` outside `RouterLink` | a page imports `Link` from `@tanstack/react-router` | lint fails |
| a story in product code | a page imports `Button.story` | lint fails |
| the CSP element | the element with the id removed from `index.html` | on `web-prod`, the console reports the refused `<style>` |

## Verification

- The full `check`, on the host and in Docker.
- `docker compose run --rm browser` twice with nothing changed: every test passes both times. That is D-14's first
  "Wrong if".
- `vite build`: no story, no gallery and no spec string in `dist`.
- Playwright MCP on the dev server (a UI plan):
  - Tab through the navigation: visible focus, the pointer on hover, `aria-current` on the current link;
  - the error screen's "Try again" by the keyboard;
  - the dark theme, by emulating `prefers-color-scheme: dark`.
- The production form, with `docker compose --profile prod up`:
  - `scripts/check-headers.sh` passes;
  - the console reports no CSP violation, and a pressable element computes the `touch-action` rule.
- `/code-review` and `/security-review` on the plan's diff.

## Out of scope

- The table, fields, selects, dialogs and every other part: they come with the screens that use them (plan 07,
  D-06).
- A control for switching the theme, and remembering the choice. The app follows the system's setting, and stories
  set `data-theme`.
- Fonts and icons, which arrive with their first use (D-28).
- Page tests, axe on pages and the keyboard-only pass (plan 07, D-09).
- Typed story ids through Playwright 1.63's `Stories` registry, once 1.63 is in.
- A list page in the gallery, and a hosted review (D-14's growth path, D-11).

## Timebox

90 minutes. The cut order, from the bottom:
1. the lint rule against importing a story; the build-output check stays in the verification;
2. WebKit and Firefox baselines: Chromium only, recorded;
3. `components/RouterLink` and the rule against the router's `Link`: the screens keep the router's `Link`, styled
   by the zone.
