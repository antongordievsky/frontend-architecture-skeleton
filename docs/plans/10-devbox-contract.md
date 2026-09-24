# Plan 10 — Bring the repository to the devbox contract

**Status:** in progress — GREEN LIGHT 2026-09-24 (the author's request, with the specifics below given
up front) · **Timebox:** 45 min of execution
**Serves:** an org-level operational policy, not Part I. **Touches:** D-23 (quarantine exclusion),
D-25 (hooks), DR-9 (CI/CD, amended)

## Why this plan exists

The agent now works on this repository from inside a devbox: a container with no Docker socket and no
route out but the npm registry, GitHub and the Anthropic API. `.githooks/pre-commit` and `pre-push` both
call `docker compose`, so a commit or a push from the devbox fails outright. The org's devbox contract
(`/etc/claude-code/CLAUDE.md`) gives a fixed checklist for closing that gap. The author gave three of its
specifics up front:

- `bunfig.toml`'s `minimumReleaseAgeExcludes` for `orval` (CC-05) was due for removal on 2026-09-17 —
  already past;
- the Docker-dependent gates (`check` in the pinned image, the `browser` service, the production header
  test) move to a GitHub Actions workflow; the local hooks keep `betterleaks`, the lockfile's age gate,
  and `bun run check`;
- install, tests and lint must be green, and the dev server must answer on `$DEVBOX_PORT`.

## Approach

- **bun-only.** Already true: `bun.lock` is the only lockfile, `packageManager` and `engines.bun` pin
  `1.4.2`, `trustedDependencies` is `["!none"]`. What is missing is the README paragraph the contract
  asks for, documenting the choice.
- **The quarantine exclusion.** `--all` on today's lockfile (run before touching anything) reports every
  locked version, orval's included, older than the 7-day quarantine — so the exclusion is dead weight,
  safe to remove outright. CC-05 gets a closing note; the exclusion mechanism itself (`bunfig.toml`,
  `check-lockfile-age.mjs`) is untouched.
- **Hooks, without Docker.** `pre-commit` loses its dependency-triggered Docker gate; the rest (staged
  secrets scan, the lockfile's age gate, `bun run check`) stays. `pre-push` is rewritten: it drops all
  three Docker steps and keeps a directory-wide secrets scan, `bun run check` again as a backstop, and —
  new — the lockfile's age gate over every locked version (`--all`). That closes a gap plan 05a noted and
  left open: a merge, rebase or cherry-pick never runs `pre-commit`, so nothing there checks what it
  brought into `bun.lock`; pre-push's `--all` now does.
- **CI takes the Docker-dependent gates.** One workflow, three parallel jobs, each `oven-sh/setup-bun` +
  `bun install --frozen-lockfile` first (so a broken lockfile fails fast, without Docker), then:
  `docker compose run --rm check`, `docker compose run --rm browser`, and `docker compose --profile prod
  up -d --build web-prod` + `scripts/check-headers.sh`. GitHub's `ubuntu-latest` runners ship Docker.
- **This amends DR-9.** DR-9 deferred CI/CD wholesale for the take-home. It is not fully undone — no PR
  flow, no agent reviewers, no update bot — but the Docker-dependent gates now run on every push, which
  DR-9's text no longer reflects. A dated amendment records it, and `ARCHITECTURE.md` §5–6 follow.
- **CLAUDE.md (an agent file) stops asking an agent to run Docker.** The hooks bullet, the D-09 testing
  note (which told the agent to run the `browser` service before a commit that touches a part, a story or
  a stylesheet), and the sandbox bullet's now-false claim about a Docker gate on dependency commits all
  get corrected. The gap this opens — a part's screenshots are no longer checked before the commit, only
  before the merge, once CI is green — is named, not silently assumed.
- **Found along the way, fixed in the same pass:** `.claude/settings.local.json` (this session's own
  enabled-MCP-servers file) is ignored by the *global* git ignore only, not the repository's own
  `.gitignore`, so `biome ci` — and therefore `bun run check` — fails on it in this environment even
  though it is never committed. One line in `.gitignore` closes it; without it, no commit in this plan
  could pass the hook.

## Steps — one commit each

1. `.gitignore`: `.claude/settings.local.json`. Commit: `chore(git): ignore the per-agent local Claude settings file`.
2. `bunfig.toml`: remove `minimumReleaseAgeExcludes` and its comment; `docs/requirements-and-analysis.md`
   CC-05 gets a closing note. Commit: `chore(deps): drop orval's aged-out quarantine exclusion (CC-05)`.
3. `README.md`: the security-choice paragraph (bun, the quarantine, the devbox). Commit:
   `docs(readme): explain bun and the quarantine as a security choice`.
4. `.githooks/pre-commit` and `pre-push`; `CLAUDE.md` (hooks, D-09 testing note, sandbox bullet, the
   obsolete package.json/Docker-gate bullet); `docs/requirements-and-analysis.md` DR-9 amendment;
   `ARCHITECTURE.md` §5–6. Commit: `build(hooks): drop Docker from the local hooks (DR-9, amended)`.
5. `.github/workflows/ci.yml`: the three jobs. Commit: `ci: run the Docker-dependent gates on push (DR-9, amended)`.

## Verification

- `bun install`, `bun run lint`, `bun run test`, `bun run typecheck` green on the host, no Docker.
- `bun run dev -- --host 0.0.0.0 --port $DEVBOX_PORT --strictPort` answers `200` on `$DEVBOX_PORT`
  (measured before step 1, with the mock backend standing in for `/api`).
- `NODE_USE_ENV_PROXY=1 node scripts/check-lockfile-age.mjs --all` exits 0 before and after step 2, so
  removing the exclusion changes nothing it would have caught.
- The full `bun run check` (host, no Docker) passes after every step's commit — pre-commit proves it on
  each one.
- The rewritten `pre-push` is exercised by hand once (`sh .githooks/pre-push`), since nothing in this
  session pushes through it until the end.
- The CI workflow's syntax is checked with `actionlint` if available on the host; otherwise by careful
  reading, since the sandbox's network reaches GitHub but this session cannot dispatch a workflow run
  before pushing.

## Out of scope

- The rest of DR-9: no PR flow, no agent reviewers as gates, no dependency-update bot. The author's own
  checklist leaves branch protection, Dependabot alerts and secret scanning to the author.
- A QR-25 update batch (`bun outdated` / `bun update`). CC-05's exclusion is removed because it aged out,
  not as part of a batch.
- Anything in the other two repositories the author mentioned mid-session (crypto, zeely) — out of this
  session's reach entirely.

## Timebox

45 minutes. The cut order, if it runs long: the CI workflow's three jobs collapse to one (`check` only,
`browser` and `web-prod` deferred) before any doc paragraph is cut.

## What happened

(filled in at wrap-up)
