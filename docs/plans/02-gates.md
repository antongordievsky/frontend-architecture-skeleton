# Plan 02 — Gates: format, lint, secrets, supply chain and hooks

**Status:** in progress — GREEN LIGHT 2026-09-10 · **Timebox:** 40 min of execution
**Serves:** FR-2 (lint in the hook and in `check`), FR-6, QR-3, QR-4, QR-11, QR-12, QR-14, QR-15, QR-23,
QR-24, QR-25, DR-6 · **Applies:** D-10, D-21, D-23, D-25

## Why this plan exists

Plan 01 left a gate made of two parts: typecheck and build. Everything the requirements promise beyond
that is still a promise:
- no `any` around money;
- React written for its compiler;
- accessible markup;
- no keys in commits;
- no fresh or scripted package slipping in.

This plan makes the machine refuse each of those before a person reads the code. It does so on every
commit, the agent's included. It also closes three follow-ups from plan 01: the Docker gate on dependency
changes, an automated test of Caddy's cache and fallback rules, and the agent sandbox.

After this plan, `check` means: format → lint → typecheck → build → secrets → audit. The hooks run it.

## Approach

The order follows dependencies. The supply-chain rules come first, so that every package this plan adds
already goes through them. The formatter comes before lint, so lint never sees unformatted code. Hooks
come last among the gates, so they run a `check` that is already complete. Every commit passes the gates
that exist at that moment. A commit that introduces a gate brings the whole tree into line with it in
the same commit.

| Decision | What it becomes here |
|---|---|
| D-23 packages | `bunfig.toml`: 7-day quarantine, `disableManifest`, `exact`. `trustedDependencies: ["!none"]`. The template's eight ranges become exact pins. `bun audit` runs in `check` |
| D-10 format and lint | Biome 2.5.12 as the formatter only. oxlint's rules are enabled by name in `.oxlintrc.json`. Both run in `check` |
| D-21 secrets and the browser | betterleaks 1.8.1: pinned in `mise.toml`, copied by digest into the image, run in `check` and in pre-commit. CSP and headers in the `Caddyfile`, with a header test. `react/no-danger` and the storage ban in lint. The Claude Code sandbox in `.claude/settings.json` |
| D-25 hooks | `.githooks/` with `pre-commit`, `commit-msg` and `pre-push`, switched on by the root `prepare` script |

## Steps — one commit each

1. **Supply chain** (D-23)
   - `bunfig.toml` and `trustedDependencies: ["!none"]`.
   - Pin every range exactly, at the version `bun.lock` already holds.
   - Commit: `build(deps): pin every package exactly and quarantine fresh versions`.
2. **Audit in `check`** (D-23): `bun audit` joins `check`. Commit: `build(check): fail on known vulnerabilities`.
3. **Formatter, generated** (D-10)
   - `bun add -d -E @biomejs/biome@2.5.12` (asks the author), then `biome init`; the output is committed
     untouched (QR-20).
   - Commit: `build(format): add Biome 2.5.12 with its generated config`.
4. **Formatter, ours**
   - Formatter only, lint off. Quote style and line width match what the code already uses.
   - `biome ci` joins `check`, and the whole tree is formatted in the same commit.
   - Commit: `style: format the tree with Biome and gate it in check`.
5. **Lint rules** (D-10, D-21)
   - `.oxlintrc.json`: pin oxlint exactly and enable every rule by name:
     - types — `no-explicit-any`, `no-non-null-assertion`, `consistent-type-definitions: type`,
       `consistent-type-imports`;
     - React — `rules-of-hooks`, `exhaustive-deps`, `purity`, `refs`, `set-state-in-render`,
       `set-state-in-effect`, `no-danger`;
     - accessibility — the `jsx-a11y` rules that exist, listed one by one;
     - token storage — `no-restricted-globals` and `no-restricted-properties`.
   - Lint joins `check`.
   - Commit: `build(lint): enable the D-10 rules by name and gate lint in check`.
6. **Secrets** (D-21)
   - `mise use betterleaks@1.8.1` (asks); the image copies `/usr/bin/betterleaks` from
     `ghcr.io/betterleaks/betterleaks@sha256:8b9d…7797`.
   - `check` scans the tracked tree, not `node_modules` or the build output.
   - Commit: `build(security): scan for secrets in check with betterleaks 1.8.1`.
7. **Hooks** (D-25)
   - `.githooks/pre-commit`: `betterleaks git --pre-commit --staged`, then the full `check`. When
     `package.json` or `bun.lock` is staged, it also builds the image and runs `check` in Docker.
   - `.githooks/commit-msg`: the header pattern.
   - `.githooks/pre-push`: `check` in Docker, plus the header test of step 8 once it exists.
   - `"prepare": "git config core.hooksPath .githooks"`.
   - From this commit on, every commit of this plan goes through the hooks.
   - Commit: `build(hooks): run check before every commit and the Docker gate before every push`.
8. **Browser policy** (D-21)
   - The CSP from D-21, plus `X-Frame-Options`-equivalent `frame-ancestors`, in the `Caddyfile`.
   - A header test, `scripts/check-headers.sh`, run against `web-prod`. It asserts:
     - the CSP is present;
     - `/assets/<missing>` answers 404;
     - a real hashed asset gets the immutable cache header;
     - `/transactions` answers 200 with `no-cache`.
   - Pre-push runs it.
   - Commit: `feat(security): serve a strict Content-Security-Policy, asserted by a header test`.
9. **Agent sandbox** (D-21)
   - A `sandbox` block in `.claude/settings.json`:
     - reads of `~/.ssh`, `~/.aws` and `.env*` denied;
     - network limited to the npm registry and GitHub;
     - `docker` excluded.
   - Commit: `chore(ai): run the agent's shell in the OS sandbox`.
10. **Docs**
    - `CLAUDE.md` § Commands: what `check` now runs, the hooks, and the package and update recipes.
    - This plan's log.
    - Commit: `docs: record plan 02`.

## Proof — each new gate seen failing (QR-23)

Recorded in the log below, never committed:

| Gate | Deliberate break |
|---|---|
| install scripts | in a scratch copy, `better-sqlite3` installs with no `build/` directory |
| audit | a scratch copy of the tree with `lodash@4.17.20` → `check` exits 1 |
| format | an unformatted file → `biome ci` exits 1 |
| each lint rule | its own violation (the D-10 spike files) → that rule fires; a rule that never fires is removed, not kept |
| storage ban | `localStorage`, `window.sessionStorage`, `globalThis.localStorage` fail; the destructuring bypass is recorded as a known gap |
| secrets | a random fake key staged → pre-commit refuses the commit; in the tree → `check` exits 1 |
| commit-msg | the 7 bad headers from D-25 are refused |
| Docker gate on dependencies | a `package.json` change that the lockfile does not match → the commit is refused |
| header test | the CSP line removed → the test fails; restored → passes |
| sandbox | reading a planted file in a denied scratch path fails; the normal loop still works |

## Verification

- A full `check` on the host and in Docker exits 0.
- A fresh clone: `docker compose up` answers 200; the production form answers 200 and passes the header
  test.
- The plan's own commits after step 7 went through the hooks — the log quotes one refusal.
- Wrap-up per `CLAUDE.md`: built-in `/code-review` and `/security-review` on the plan's diff.

## Out of scope — and where it goes

Boundary rules between layers and pages go to plan 03 (D-16), including the local JS plugin D-10 proved.
Tests and Vitest go to plan 04 (D-09). The browser-level CSP check joins the first end-to-end test. The
CI update bot is D-11.

## Risks watched during execution

- *oxlint 1.82.0 is 3 days old.* Pinning it exactly must not re-resolve it through the quarantine; if it
  does, pin 1.81.0 and record why.
- *`disableManifest` costs install time* — measured here.
- *The sandbox may break the loop:* mise downloads, Bun's registry calls, the CodeGraph index. The
  fallback from D-21 is to keep the narrowed rules and name the gap in `ARCHITECTURE.md`.
- *betterleaks in Docker:* the Node image has no `git`, so `check` scans files, not history; history is
  covered by pre-commit and, later, CI.
- *Hooks slow the agent's loop:* pre-commit is about a second today, the Docker gate only on dependency
  changes. If a commit takes more than ~10 s, D-25's "wrong if" applies.
- *The timebox.* The cut order is step 9 first, then step 8. A cut is recorded here and in
  `ARCHITECTURE.md` § Skipped.

## What happened

*(filled at wrap-up)*
