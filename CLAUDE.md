# Frontend foundation — agent context

Read first: [`docs/requirements-and-analysis.md`](docs/requirements-and-analysis.md). Part I =
requirements (IDs: C-, FR-, QR-, DR-). Part II = decisions; every `Accepted` entry is a hard constraint.
Part III + `docs/plans/` = delivery. The task itself is in [`README.md`](README.md).

This file is the working agreement: how work happens here. It does not restate the requirements.

## Commands

Everything runs in Docker (C-2). Host commands use the runtimes pinned in `mise.toml` (`mise install`).

| What | Command |
|---|---|
| Development, hot reload — http://localhost:5173 | `docker compose up` |
| Production form via Caddy — http://localhost:8080 | `docker compose --profile prod up` |
| Full check, in Docker | `docker compose run --rm check` |
| Full check, on the host | `mise exec -- bun run check` |
| Format the tree | `mise exec -- bun run format` |
| Lint · typecheck only | `mise exec -- bun run lint` · `mise exec -- bun run typecheck` |
| Tests only (Vitest, logic in Node) | `mise exec -- bun run test` |
| Component tests and screenshots, three engines (D-14) | `docker compose run --rm browser` |
| Rewrite the screenshot baselines, on purpose, then look at the images in the diff | `docker compose run --rm browser --update-snapshots` |
| Regenerate the API client after a contract change | `mise exec -- bun run generate` |
| Regenerate the route tree after adding, renaming or removing a route file (the dev server does it too) | `mise exec -- bun run routes` |
| Production headers and cache rules (with `web-prod` running) | `sh scripts/check-headers.sh` |
| The stand-in backend alone, on the host | `MOCK_PORT=3001 mise exec -- bun run mock/server.ts` |
| Refresh the code index | `mise exec -- bun run graph:update` (`graph:build` rebuilds from scratch) |

- `WEB_PORT` and `PROD_PORT` override 5173 and 8080 when they are taken.
- `check` = format → lint → tokens → contract drift → route-tree drift → typecheck → tests → build →
  secrets → audit. `lint` is oxlint, then `lint/layers.test.mjs`, which proves the D-16 boundary rule on
  its fixture. `scripts/check-tokens.mjs` keeps every colour and custom property in `src/ui/tokens.css`,
  and refuses a `var(--…)` that file does not define (D-28). Both drift gates (`scripts/check-contract.sh`, `scripts/check-routes.sh`) regenerate into a
  scratch copy under `node_modules/.cache` and compare; they never write to the tree.
- The contract (`contract/openapi.yaml`) is the source of every server type (QR-5). `src/api/generated`
  is its output: never edited by hand, skipped by Biome, private to `src/api` (lint).
- Tests (D-09): `*.test.ts` beside the code they test, run by Vitest in Node — no simulated page;
  anything that renders is Playwright's. A part's states are stories (`<Name>.story.tsx`, one export
  each), mounted by `<Name>.spec.ts` in the story gallery (`playwright/gallery/`, D-14) in Chromium,
  WebKit and Firefox, with zero-tolerance screenshots in `__screenshots__/`. Whole pages and user flows
  run in Chromium and WebKit only (D-14's amendment, QR-22); the product ships one theme, so a state has
  one baseline, not one per theme (D-28's amendment). The baselines are Linux
  images, so these run only in the `browser` service; before a commit that changes a part, a story or a
  stylesheet, the agent runs it (D-09's note). The stand-in backend is `mock/handler.ts` (D-04); a
  test plugs it into `fetch` with `asFetch`. Only test files may import from outside `src/`, and only
  `mock/` (lint). The type-level amount test (`*.typetest.ts`) is checked by `typecheck`.
- Any change to `package.json` — a script included — makes pre-commit run the Docker gate, which the
  sandbox refuses (`~/.docker` is not writable), so such a commit runs outside it (found in plan 04).
- Boundaries (D-16): the layer map is in `lint/layers.js`; the zones that exist are the rule's option in
  `.oxlintrc.json`. A new top-level folder in `src/` fails lint until its row is added. A new boundary
  gets a marked case in `lint/fixtures/layers` in the same commit. Only `ui/` imports React Aria, only
  `components/RouterLink` imports the router's `Link`, and only stories and specs import a story; raw
  `a`, `button`, `input`, `select`, `textarea` and `dialog` exist only inside `ui/` (FR-5).
- Adding a part (QR-17): `src/ui/<Name>/` with `<Name>.tsx` wrapping React Aria, `<Name>.module.css`
  (tokens only, styled through React Aria's `data-*` states, with the pointer and a keyboard focus ring)
  and `<Name>.module.d.css.ts` naming its classes, `index.ts`, `<Name>.story.tsx` and `<Name>.spec.ts` →
  `docker compose run --rm browser --update-snapshots` → look at every new image → `check`.
- Routes (D-05): route files in `src/routes/` belong to the shell and stay thin — a path, a search
  schema, the page from its zone's `index.ts`. `src/routeTree.gen.ts` is generated from them
  (`tsr.config.json`): committed, never edited by hand, skipped by Biome. A page reads its parameters
  through `getRouteApi('<route id>')`, never by importing its route file. Failures render through the
  router's defaults, `components/ErrorScreen` (D-18).
- Adding a page (QR-17): `src/<zone>/pages/<Name>/` with `index.ts` and `<Name>Page.tsx` → export it
  from the zone's `index.ts` → a route file in `src/routes/` that imports it from `@/<zone>` →
  `bun run routes` → `check`.
- `package.json` declares every module free of side effects except CSS, so each page gets its own
  chunk (CC-07). A module imported only for what it does on import is dropped silently: list it in
  `sideEffects`, or call its effect from `main.tsx`.
- Hooks (`.githooks/`, switched on once by `bun install` through `prepare`). Each refuses to run while
  the working tree differs from what it checks; set unrelated changes aside with
  `git stash push --include-untracked -- <paths>`.
  - pre-commit — the staged secrets scan and the full `check`, plus the Docker gate when dependencies
    or the image change, and the lockfile's age gate when `bun.lock` changes: a version the commit adds
    must be older than the quarantine (CC-08);
  - commit-msg — the Conventional Commits header, at most 100 characters;
  - pre-push — `check` in Docker, the `browser` service, and the header test on the production form, on
    its own compose project and port (`PRE_PUSH_PORT`, default 18080).
- Adding a package (D-23): verify it first (Security below), then `mise exec -- bun add <name>`. It
  asks the author, saves an exact version, and refuses versions younger than 7 days.
- Updating (QR-25): one batch at the start of a plan — `bun outdated`, then `bun update <names>`,
  majors one at a time with the changelog read; one commit per batch, through `check`. The batch opens
  with `NODE_USE_ENV_PROXY=1 mise exec -- node scripts/check-lockfile-age.mjs --all`, which shows that
  nothing locked is younger than the quarantine.
- The agent's shell is non-interactive and has no mise hook — on its own it picks nvm's Node — so the
  agent runs every project command through `mise exec --`. Package changes ask the author either way.

## Workflow

Requirements (Part I) are written once and change only with the author's agreement. Then, per plan:

1. **Decide** — `/staff direction` produces the Part II decisions this plan needs, one at a time; the
   author accepts or rejects each. Nothing is decided ahead of the plan that needs it.
2. **Plan** — `docs/plans/NN-<slug>.md`, narrative: context, the IDs it serves, approach, steps,
   verification, out of scope, timebox. GREEN LIGHT from the author before any code.
3. **Execute** — autonomous after GREEN LIGHT.
4. **Wrap-up** — gates, review, commit, merge; the author reviews before the next plan starts.

## The orchestrator (the agent in the main session)

- Drives the stage the author is in; never skips a gate; never starts code without GREEN LIGHT.
- Execute: follows the plan in order; one layer at a time.
- Tests — the rule has no exceptions:
  - every behaviour change ships with its tests in the same commit;
  - every new test is proven to catch: break the code or feed it a case that must fail, run the test,
    see it fail for the right reason, restore — only then is it kept. The plan's log records how each
    test was proven (which break, which failure);
  - the same holds for every new gate: a lint rule, a boundary, a scanner is proven by a deliberate
    violation before it is trusted. A check never seen failing is not a check.
- Stops and returns to the author only when: a gate fails and cannot be fixed, the plan is wrong about
  something structural, an `Accepted` decision would have to be violated, or the timebox is about to be
  exceeded (then: propose what to cut).
- Wrap-up, in order: full `check` (never a partial run) → UI plans: drive the app with Playwright MCP →
  built-in `/code-review` on the plan's diff, and `/security-review` when that diff touches a named surface —
  a session, permissions, cookies or headers, the CSP or the proxy, the stand-in's HTTP boundary, or a
  dependency. A plan of tokens, stylesheets and presentational parts skips it, and the plan's log says so and
  why; fix or record findings → append
  "What happened" to the plan (deviations, surprises, commands run) → commits → fast-forward merge.
- Subagents: read-only research or independent verification only. They never commit.
- Reports what happened, including skipped steps and quoted failures. No "should work".

## Decisions

- Measure, do not recall: versions, sizes, behaviour come from a command run in this session.
- Every Part II entry has one shape (template in Part II), written for two readers:
  - for a product manager — a title that is a plain question, and "What we are deciding" in business
    language with no tool names: what is at stake and the tension between the options;
  - for a reviewer — a trade-off table (options × the judging requirements, cost today, cost of
    changing later, the company's stack; cells ✅ ⚠️ ❌ ❓ with a few words);
  - then the conclusion: Decision, Evidence, Wrong if, Where it leads (gains, costs, growth path).
- The entries are the single source for `ARCHITECTURE.md`: its sections are assembled from each entry's
  Decision and Where it leads, not rewritten. If the summary needs different words, fix the entry first.
- Changing an `Accepted` decision = an amendment written in Part II, agreed first. Never silently.
- Course corrections are recorded, not erased: when evidence overturns an assumption — even one never
  written down — the earlier reasoning stays, and a dated entry in Part II § Course corrections says what
  was assumed, what was found and what changed. `ARCHITECTURE.md` retells that chain of thought.

## Generators first

- If an official CLI or generator exists for the job, use it — project scaffold, component registries,
  router and contract codegen, test-runner and linter `init`, auth generators. Do not re-type what a
  tool produces, and do not invent boilerplate from memory.
- Record the exact command (with version) in the plan's log and in the commit body.
- Generated output and hand edits go in separate commits, so a reviewer sees what was authored.
- Hand-writing is for what no tool can know: our boundaries, our domain types, our decisions.

## Git — trunk-based, local-first

- One short branch per plan (`<type>/<slug>`), fast-forwarded into local `main` right after its wrap-up.
  No pull requests and no CI for this take-home. The local `check` is the gate. Pre-commit runs it on
  every commit, and pre-push runs it again in Docker as a backstop. CI/CD is a deferred decision (DR-9).
- Commits stay local until the author has reviewed them; one push at the end, on the author's go.
- Conventional Commits: `type(scope): imperative subject`; body = what changed, why, how verified,
  requirement/decision IDs. One concern per commit.
- Every commit passes every gate that exists at that commit — no exceptions. A commit that introduces a
  gate makes the whole tree pass it in that same commit; generated code lands before our rules exist, or
  already conforming to them.
- Never: `--no-verify`, force-push, `reset --hard`, amending commits already reviewed.

## Security — closed by tools wherever a tool exists

- No secret in the repository, ever. Only `.env.example` with placeholders; `.env*` is ignored.
- Anything behind `VITE_*` ships in the bundle — it is public by definition.
- Secret scanner in the pre-commit hook and `check`; a finding blocks the commit. Triage it — never
  widen the allowlist to make it pass.
- The agent does not read `.env*` or credential files — denied in `.claude/settings.json`, and never
  worked around through the shell — and they are excluded from the code index. Secrets must never
  enter an agent's context.
- The browser never holds an auth token (DR-2); token storage and `dangerouslySetInnerHTML` are lint
  errors. Untrusted data (memos, imported fields) renders as text.
- Telemetry and logs never carry financial data or PII — scrubbed at the reporter seam (QR-10).
- Packages (QR-24): the agent never adds, removes or updates a package without the author's explicit go
  — package commands always ask (`.claude/settings.json`). Before proposing a package, verify it in the
  registry: the exact name exists and is the intended one, its age, maintainers, repository and
  provenance. A name recalled from memory is not verified — invented package names are a known attack.
- One-off runners (`npx`, `bunx`, `bun x`) download and execute code; they ask first as well.
- Installs are frozen, the audit runs in `check`, each new package has a written reason, and updates
  are a deliberate batch (QR-25) — never a side effect of another change.
- New MCP servers and external agent skills are reviewed before they are added — they run with the
  agent's rights.
- A control no tool can enforce is named as such in `ARCHITECTURE.md` — never silently assumed.

## Scope control

- One concern per plan and per session. Adjacent findings are written down (Part I §10 or the plan's
  log), not fixed in passing. A refactor does not change behaviour.
- Time budget: execution 1.5–2 h in total; each plan carries its own timebox. Plans are ordered
  must → stretch; an overrun cuts from the bottom and the cut is recorded in `ARCHITECTURE.md`.

## Conventions

- Everything in the repository is English. Conversation with the author may be in any language.
- Comments explain why, never what. No dependency without a written reason (QR-8).
- No default value beside a rest element in a component's parameters — `({ variant = 'x', ...props })`. The
  React Compiler (D-13) cannot lower it, and `panicThreshold: 'all_errors'` turns that into a build error that
  surfaces as unrelated modules failing to load. Read the absent value in the expression instead (plan 07).
- Docs are written for a cold reader: why, current state, decision + rejected alternative, pointers,
  next actions.

## AI tooling

- CodeGraph (MCP) — structural questions (where / who calls / what breaks) before sweeping files with
  grep. Rebuild the index after adding or removing files.
- Playwright MCP — drive the running app at the wrap-up of every UI plan: Tab through it, check focus,
  cursor, roles and the four states. A verification loop, not a gate: the durable guards are lint rules
  and tests (QR-12).
- Both in `.mcp.json`, pinned exactly, installed locally with the scaffold (plan 01).
- Built-in skills over custom agents: `/code-review` and `/security-review` at wrap-up.
- `/staff` (`.claude/commands/staff.md`) — decisions (`direction`) and plan reviews.
- `.claude/settings.json` pre-approves safe commands and denies destructive ones and secret reads.
- The agent's shell runs in Claude Code's OS sandbox (same file):
  - it cannot read `~/.ssh`, `~/.aws` or `.env*`, whatever program it uses;
  - it cannot reach the Docker socket, or write the compose files, `.env` or `~/.docker`, which decide
    what docker does;
  - its network is limited to the registry, GitHub, ghcr.io and localhost.

  `docker` runs outside the sandbox, and the agent's `docker compose` commands are pre-approved. A
  container they start runs project code with write access to the tree and an open network. That gap
  is named, not closed: D-26, deferred. A commit that changes dependencies runs the Docker gate, so it is
  committed outside the sandbox, with the author's approval. So is a merge or branch switch that changes
  `.claude/settings.json` or a compose file: the sandbox refuses git's write to those. Such a switch stops
  half-done, with the tree between two commits, so finish it outside the sandbox — `git checkout -- <file>`
  for what it could not rewrite, then the merge again (found in plan 06).
- Everything else in the AI layer is decided in D-15 and exists only with a consumer (QR-18).
