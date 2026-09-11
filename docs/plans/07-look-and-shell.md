# Plan 07 — The look, and the shell every zone sits in

**Status:** draft — awaiting GREEN LIGHT · **Timebox:** 60 min of execution
**Serves:** FR-5, QR-12, QR-17, QR-22, QR-23, QR-8, C-2 · **Applies:** D-29, D-28 (amended), D-14 (amended),
D-07, D-16, D-09

## Why this plan exists

The skeleton works and looks like nothing: a row of links in the browser's default type on a white page. That is
the first thing anyone opens, and an unfinished screen reads as unfinished work.

It comes **before** the transactions page on purpose. The table is the largest visual surface in the product; if
the palette moves after it exists, every one of its baselines is photographed twice and reviewed twice. Doing the
look first costs one plan and saves that.

It is also the only honest test of D-28's central promise — *"a redesign changes the tokens file and the parts'
stylesheets, never the screens"*. This plan moves the entire palette. If a screen has to be edited to follow, the
promise was false, and that is a finding worth more than the redesign.

## Approach

| Piece | Where | Decision |
|---|---|---|
| One theme, new values | `src/ui/tokens.css` keeps its three tiers and changes what is in them: the cool-neutral surfaces, ink, lines and indigo accent read from the author's `careero` palette. The dark set, the `prefers-color-scheme` block and the hand-kept copy of it are deleted — with them goes the cost D-28's own § Costs complained about | D-29, D-28 (amended) |
| Type that resolves the same in the image | `--font-sans` stays a stack, with no package and no download. **Measured first:** the baselines are taken on Linux inside Microsoft's Playwright image, so the plan checks what `system-ui` resolves to there before fixing the stack, and writes the answer in the log. A stack that silently falls back to a different family in the image would make every baseline a photograph of the wrong font | D-29, D-14 |
| New tokens, in the tiers that exist | raw: a corner scale and two shadows. meaning: the shell's own measurements — sidebar width, header height, page padding. Nothing invented that no part uses (QR-8) | D-29, D-28 |
| A text field | `src/ui/TextField/` on React Aria's `TextField`, `Label`, `Input`, `Text` and `FieldError`: label always present, description and error tied to the input by the library, error state styled through `[data-invalid]`. Plan 09's sign-up is its consumer | D-07, QR-12, QR-17 |
| One side navigation, shared | `src/components/SideNav/` — a `nav` landmark with a name, its items passed in as data, each drawn with `RouterLink` so the router marks the current page. It lives in `components/` because two zones will use it with different items (plan 09), and a zone may not import another zone | D-16, D-05 |
| The shell | `src/app/AppLayout.tsx` becomes a sidebar beside a `main`: brand, navigation, and the page's own heading inside `main`. It is the shell, not a page — no page's `.tsx` is touched by this plan | D-29, FR-1 |
| The baselines | The `colorScheme` loop leaves `Button.spec.ts` and `Link.spec.ts`; the 18 dark images are deleted; the 18 light ones are re-shot in three engines, and every new image is looked at | D-14 (amended) |

**Packages:** none. This plan adds no dependency, and runs no update batch — the browser version in the Playwright
image is deliberately left where it is, because a new engine would move every baseline in the same commit that
re-shoots them for the palette, and the two causes could not be told apart (QR-25, recorded in the log).

## Steps

1. **Docs.** This plan, D-29 and D-30, the amendments to D-28 and D-14, the re-ordered Part III.
   - Commit: `docs(plans): put the look before the table, and add plans 07 and 09`.
2. **Measure the font.** Run the Playwright image, list the families it resolves for `system-ui` and for the
   candidate stack, and record both in the log. Fix `--font-sans` to what is stable there and on a Mac.
   - No commit of its own; the answer lands with step 3.
3. **The tokens.** The new palette, the corner and shadow scale, the shell's measurements; the dark blocks
   deleted. `base.css` loses the `[data-theme]` ground rule it only needed for dark stories.
   - Commit: `feat(ui): one theme, re-tuned tokens, and the shell's measurements (D-29)`.
4. **The baselines follow.** The `colorScheme` loops leave both specs, the dark images are deleted, the light
   ones re-shot in three engines and reviewed one by one.
   - Commit: `test(ui): one theme's baselines, re-shot for the new palette (D-14)`.
5. **Prove D-28.** `git diff --stat` for steps 3–4 must show no file under a zone's `pages/`. The number goes in
   the log, and in `ARCHITECTURE.md` later: this is the evidence for the promise.
   - No commit; it is a check on the two above.
6. **The text field.** `ui/TextField` with its stylesheet, stories (at rest, described, invalid, disabled), spec
   and baselines.
   - Commit: `feat(ui): a TextField part, labelled and described by React Aria (D-07)`.
7. **The side navigation.** `components/SideNav` with its stylesheet, story and spec.
   - Commit: `feat(components): one side navigation, its items passed in as data (D-16)`.
8. **The shell.** `AppLayout` becomes sidebar and `main`; the brand; the page heading inside `main`.
   - Commit: `feat(app): the taxpayer's zone gets its shell (D-29)`.
9. **Wrap-up**, below, then `CLAUDE.md` (one theme, the engine split) and this plan's log.
   - Commit: `docs: record plan 07`.

## Proof — each new test and gate seen failing (QR-23)

| Test or gate | Deliberate break | Expected |
|---|---|---|
| the token gate still bites after the port | write `#fff` in `AppLayout.module.css` | `check-tokens` names the file, the line and the property |
| a token that does not exist | use `var(--shadow-3)`, which the file does not define | `check-tokens` fails naming it |
| the palette reaches every part | move `--accent` by one unit | every re-shot screenshot fails, in all three engines |
| the dark theme is gone, not hidden | emulate `prefers-color-scheme: dark` in a spec | the body still paints the light surface; the spec fails if a dark block survives |
| the field's error is tied to the input | drop React Aria's `FieldError` and print the message in a `div` | the spec asking for the input's accessible description fails |
| the field says it is invalid | remove `[data-invalid]` from the stylesheet | the invalid baseline fails |
| the pointer and the focus ring on the field | remove the ring from the base style | the spec asserting `outline-style: solid` after Tab fails |
| the navigation is a named landmark | remove its `aria-label` | the spec that finds `nav` by name fails |
| the current page is announced | drop `activeOptions` so two links match | the spec asserting one `aria-current="page"` fails |
| the shell does not trap the keyboard | put `tabindex="-1"` on the main region | the Tab-order spec fails |

## Verification

- The full `check`, on the host and in Docker.
- `docker compose run --rm browser` twice with nothing changed: no flake at zero tolerance.
- Every new baseline opened and looked at, not just counted.
- `docker compose up` and `--profile prod`: the shell renders the same in both.
- Playwright MCP on the running app: Tab from the top, through the navigation into the page, checking focus, the
  pointer and the landmarks.
- `/code-review` on the plan's diff. **`/security-review` is skipped for this plan**, and the reason recorded:
  the diff is tokens, stylesheets, two presentational parts and a layout — no session, no permissions, no
  headers, no proxy, no dependency. The criterion is now written in `CLAUDE.md`; plan 09 is where it runs.

## Out of scope

Icons; a web font (D-29's growth path); the dashboard's and settings' content; anything the three audiences do
(plan 09); the transactions table (plan 08); motion beyond what a part already has.

## Timebox

60 minutes. The cut order, from the bottom:
1. the shadows (flat surfaces with lines only — the palette still lands);
2. `SideNav`'s story, if the shell's own tests cover it (recorded as a gap in D-14's terms);
3. `ui/TextField`, which then moves into plan 09 beside its consumer.

Steps 3 to 5 cannot be cut: they are the plan.
