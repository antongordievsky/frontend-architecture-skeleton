# Plan 01 — Scaffold: a running app in Docker, on the decided toolchain

**Status:** done — 2026-09-10 · **Timebox:** 30 min of execution (overrun, see the log)
**Serves:** C-2, QR-3, QR-13, QR-19, QR-20, QR-23 · **Applies:** D-01, D-02, D-12, D-13, D-22 (D-24 lands in plan 04)

## Why this plan exists

Every later plan needs the same ground: an app that starts with `docker compose up`, compiles under the
agreed compiler and flags, builds through the React Compiler, and can be verified with one command in
Docker. This plan lays that ground and nothing else — no lint rules, no routing, no API layer. It also
installs the agent's tooling (CodeGraph, Playwright MCP), which needs a lockfile and therefore had to
wait for D-02.

## Prerequisite for the author

Node 24.21.0 and Bun 1.4.2 on the host, for the local commands and the agent (Docker carries its own;
the app itself never needs them — `docker compose up` works with Docker alone, C-2).

Chosen with the author and recorded as an amendment to D-02: **mise** 2026.9.4, installed with
Homebrew. One tool pins both runtimes in `mise.toml`
in the repository, so whoever clones it gets exactly these versions — QR-13's "runtime pinned in a file"
holds for the host too, not only for Docker. Rejected: nvm for Node plus a global `npm install -g
bun@1.4.2` — no new tool, but two mechanisms, and nothing in the repository would enforce the Bun
version (`packageManager` only describes it); Bun's official install script — it runs a remote script,
the class of risk QR-24 guards against. Admission check (QR-24), 2026-09-10: MIT, Rust, 33.7 k stars,
releases on 2, 7, 8 and 9 September, a human commit the same day; `node` and `bun` both in its registry.

The author installs it (`brew install mise`) and adds the shell hook to `~/.zshrc`; the agent does not
edit the author's shell configuration.

## Approach

The decisions are applied in the order they depend on each other, one commit each, and every commit
passes the gates that exist at that moment (the gate here is `bun run check` = typecheck + build; it
grows in later plans). Generated code lands first and untouched (QR-20); everything after it is a
visible hand edit.

| Decision | What it becomes here |
|---|---|
| D-01 one app | the repository root is the app; `contract/` and `src/domain/` are created when their first file lands (plan 04), not now — no empty folders (QR-8) |
| D-02 Bun + Node | `packageManager: bun@1.4.2`, `mise.toml` pinning Node 24.21.0 and Bun 1.4.2 for the host (D-02 amendment), one `bun.lock`, frozen installs everywhere automated |
| D-22 TypeScript 7.0.2 | exact pin; `strict` plus the four flags in `tsconfig.app.json`; `typecheck` = `tsc -b` |
| D-13 React Compiler | `@rolldown/plugin-babel` + `babel-plugin-react-compiler` 1.0.0, `reactCompilerPreset({ panicThreshold: "all_errors" })` |
| D-12 two modes | multi-stage `Dockerfile` (Node image + Bun binary → deps → dev / build → Caddy 2.11.4-alpine), `compose.yaml` with `web`, `web-prod` (profile `prod`) and `check` (profile `tools`) |
| QR-19 agent tooling | `@optave/codegraph` 3.17.0 and `@playwright/mcp` 0.0.80, exact pins, in `.mcp.json` |

## Steps — one commit each

1. **Generate** — `bun create vite@9.2.1 app --template react-ts` in a scratch directory (the generator
   will not write into a non-empty root without overwriting), then copy the output in verbatim, except
   the template's `README.md` (the task README stays) and its `.gitignore`, merged into ours.
   Commit: `chore(scaffold): generate the app with create-vite 9.2.1 (react-ts)`.
2. **Placeholder shell** — replace the template's counter demo with a static placeholder; no behaviour of
   ours exists yet, so there is nothing to test. Commit: `chore(scaffold): replace the template demo with a placeholder`.
3. **Toolchain pins** (D-02, QR-13) — `mise.toml` pinning Node 24.21.0 and Bun 1.4.2 for the host;
   `packageManager` and `engines` in `package.json`, matching the Docker image tags; TypeScript pinned to
   7.0.2 (the template ships `~6.0.2`); `bun install` → `bun.lock`; scripts `typecheck` and `check`.
   Commit: `build: pin Bun 1.4.2, Node 24.21.0 and TypeScript 7.0.2`.
4. **Strict flags** (D-22) — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`,
   `verbatimModuleSyntax` on top of `strict`. Commit: `build(ts): turn on the D-22 strict flags`.
5. **React Compiler** (D-13) — the three packages (package commands ask the author), the preset with
   `all_errors`. Commit: `build(react): compile components with the React Compiler, failing loudly`.
6. **Docker, two modes** (D-12, C-2) — `Dockerfile`, `compose.yaml`, `Caddyfile` (static files, `index.html`
   fallback for client routes, compression, long-cache headers for hashed assets; the CSP arrives with
   D-21 in plan 02), `.dockerignore`. Commit: `build(docker): run dev and production modes, and check, in Docker`.
7. **Agent tooling** (QR-19) — the two packages, `.mcp.json`, `graph:build` / `graph:update` scripts,
   `.codegraph/` ignored, `.claude/settings.json` allowing `bun run`, frozen installs, `docker compose`
   and the MCP tools — package changes keep asking. Commit: `chore(ai): add CodeGraph and Playwright MCP`.
8. **Docs** — the Commands section of `CLAUDE.md`; this plan's log. Commit: `docs: record plan 01`.

## Proof — each new gate seen failing (QR-23)

Recorded in the log below, never committed:

- strict flags: an `enum`, an unchecked index access and an explicit `undefined` in an optional field → TS1294, TS2532, TS2375;
- React Compiler: a `0n` inside a component fails `bun run build`; the unminified build of the placeholder shows the compiler runtime;
- frozen install: a dependency added to `package.json` without updating `bun.lock` fails the Docker build;
- `check` in Docker: a type error makes `docker compose run --rm check` exit non-zero.

## Verification

- A fresh clone into a scratch directory: `docker compose up` → http://localhost:5173 answers 200;
  `docker compose --profile prod up` → http://localhost:8080 answers 200, and a deep link such as
  `/transactions` falls back to `index.html`; `docker compose run --rm check` exits 0.
- On the host: `bun run check` exits 0; `bun run graph:build` indexes the tree; Playwright MCP opens the
  dev server and reads the page.
- Wrap-up per `CLAUDE.md`: full `check`, the Playwright MCP pass, built-in `/code-review` and
  `/security-review` on the plan's diff.

## Out of scope — and where it goes

Lint rules, formatting, hooks and commit linting (plan 02 — the template's `oxlint` config stays as
generated until D-10); the CSP and its test (plan 02, D-21); boundaries and zones (plan 03); the
contract, `orval`, the `js-yaml` override, the DOM-free domain tsconfig and the first tests (plan 04);
routing (plan 05).

## Risks watched during execution

- `@playwright/mcp` 0.0.80 depends on a pre-release (`playwright` 1.63.0-alpha) — recorded against QR-24;
  how it finds a browser (system Chrome by default, or a downloaded Chromium) is measured here.
- How Bun resolves peer ranges with TypeScript 7 — the check from D-02 that could not run then.
- `node_modules` must live in a named volume, not the bind mount, or host and container binaries mix.
- mise in the agent's shell: the usual activation fires on the interactive prompt, while the agent's
  shell is non-interactive — shims (`mise activate --shims`) or `mise exec` are measured here, and
  whichever works goes into `CLAUDE.md`. mise and the existing nvm must not fight over `PATH` inside the
  project directory.
- Caddy's config length against nginx's — D-12 promised to confirm it here.

## What happened

Executed 2026-09-10 on `build/01-scaffold`. The execution ran over its 30-minute timebox; most of the
overrun went into the Docker incident below.

**Deviations and surprises**

1. *The agent's shell did not see mise.* It is a login but non-interactive shell, started before the
   author added the hook, so it resolved nvm's Node 24.15.0. `mise exec --` gives exactly the pinned
   Node 24.21.0 and Bun 1.4.2, so every project command runs through it (`CLAUDE.md` § Commands).
2. *Babel 8, not 7.* Bun resolved `@babel/core` to 8.0.1 where the spike had 7.29.7. `@rolldown/plugin-babel`
   declares `^7.29 || ^8`, and the build is green on 8, so it stays.
3. *A hole in our own guardrail.* The "ask" rules matched `bun add` but not `mise exec -- bun add` — wrapping
   a command bypassed them. Closed in step 7; until then every package in this plan was installed with a
   plain `bun add`, so the author was asked each time.
4. *Incident — step 7 broke `docker compose up`.* CodeGraph pulls `better-sqlite3`; Bun's built-in trust
   list lets it start a native node-gyp build, which the slim image cannot complete. My step-7 check ran on
   the host only; the fresh-clone verification caught it. First fix tried: an empty `trustedDependencies`
   list — it did not stop the build (Bun's defaults still applied), so it was removed rather than kept as a
   control that controls nothing. The fix: the image installs with `--ignore-scripts`; nothing the app
   builds with needs an install script. Step 7's commit was amended — it had been neither reviewed nor
   merged — so no red commit reaches `main`. Lesson for plan 02: a commit that changes dependencies must
   also pass the Docker gate, and a hook should enforce it rather than memory.
5. *`README.md` changed under us* — reformatted, most likely by the IDE. The author confirmed it was not
   intended; restored to the task text.

**Gates proven (QR-23)**

| Gate | Deliberate break | Result |
|---|---|---|
| strict flags | an `enum`, an unchecked index access, `undefined` in an optional field | TS1294, TS2532, TS2375; clean again after removal |
| React Compiler, `all_errors` | a `0n` literal inside a component | `vite build` exit 1; the unminified bundle otherwise carries the compiler runtime |
| frozen lockfile | a dependency added to `package.json` only | image build exit 1: "lockfile had changes, but lockfile is frozen" |
| `check` in Docker | a type error | exit 1 (TS2322) |

**Measured along the way**

- Bun with TypeScript 7.0.2: no peer warnings — the open question from D-02, answered for this chain.
- Caddy against nginx (D-12 promised to confirm): 18 against 21 lines for an equivalent, `nginx -t`-valid
  config. Length is not the argument; nginx drops inherited `add_header` directives inside any `location`
  that sets its own, so security headers must be repeated per location, and its alpine image has no zstd.
- Playwright MCP's browser path: headless system Chrome opened the dev server and read the heading and the
  accessibility tree. The MCP tools themselves load at the next session start.
- `bun audit`: nothing in 235 packages. Against QR-24: `@playwright/mcp` 0.0.80 pulls a pre-release,
  `playwright` 1.63.0-alpha-2026-08-31.
- From a fresh clone: dev answers 200 in 6 s and production 200 in 4 s with warm image layers — a
  reviewer's cold first run takes longer and is still to be measured; `/transactions` falls back to
  `index.html`; `check` in Docker exits 0.

**Versions used:** create-vite 9.2.1 (via `bunx`), Bun 1.4.2, mise 2026.9.4, Node 24.21.0, TypeScript 7.0.2,
Vite 8.3.0, `@babel/core` 8.0.1, `babel-plugin-react-compiler` 1.0.0, CodeGraph 3.17.0, Playwright MCP
0.0.80; images `node:24.21.0-slim`, `oven/bun:1.4.2-slim`, `caddy:2.11.4-alpine`.

**Reviews at wrap-up**

`/code-review` (medium) raised four findings. All four are fixed, each in its own commit:

1. *A missing hashed asset got the app shell, cached for a year.* The `index.html` fallback also caught
   `/assets/*`, and the asset matcher then stamped the HTML `immutable`. Now a missing asset answers 404;
   only files that exist get the long cache. Measured before → after: `/assets/does-not-exist.js`
   200 `text/html` immutable → 404.
2. *The `node_modules` volume went stale.* It outlives image rebuilds, so a dependency change was never
   seen by dev or `check`. Both now re-sync the volume with `bun.lock` on start, which is a no-op in
   4–70 ms when nothing changed. Proof: with `react` deleted from the volume, the old command fails
   (`failed to resolve import "react"`), and the new one reinstalls and passes.
3. *`check` in Docker wrote a root-owned `dist/` into the tree on Linux hosts.* `check` now builds into
   `node_modules/.cache/check-build`, which is a volume in Docker and ignored on the host. `build` still
   writes `dist/`.
4. *Allow rules with wildcards on commands that run code* — `bun run *`, `node_modules/.bin/*`,
   `docker compose --profile *` and `docker compose run --rm check*`. They auto-approved arbitrary code,
   which gets around both the deny rules and the package ask rules. Now only exact commands are allowed.

`/security-review` raised two candidates. The false-positive pass rated both 7/10, below the report's
threshold of 8, so the formal report is empty. Both were fixed anyway, because each breaks a control
`CLAUDE.md` claims:

- the wildcard rules, the same as code-review finding 4;
- the blanket `mcp__playwright` allow, which auto-approved `browser_run_code_unsafe`. That tool runs any
  JavaScript in the server process on the host; it is on by default in 0.0.80. Now Playwright tools are
  allowed one by one, and `browser_run_code_unsafe` and `browser_file_upload` are denied. The same pass
  found that `git diff --no-index` reads any file; it is denied too.

Two things remain open:

- *Not closed:* permission rules match command strings, not behaviour, so a reordered flag or a new option
  on an allowed tool can still reach outside the repository. The hard guarantee is an OS-level sandbox
  for the agent — for D-21 to decide (plan 02).
- *Not proven (QR-23):* the narrowed rules have not been seen stopping a command. Proving them means
  deliberately prompting the author, so this proof waits for D-21's sandbox decision.

**Follow-ups:**
- plan 02:
  - a hook runs the Docker gate on dependency changes;
  - the Caddy cache and fallback behaviour gets an automated test, alongside the CSP test (D-21);
  - the agent sandbox (D-21);
- D-23 — whether the host also installs with scripts off (lefthook's postinstall will ask the question);
- the cold-start time of `docker compose up`, for the README.
