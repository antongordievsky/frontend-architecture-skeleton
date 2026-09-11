# Plan 05a — A version younger than the quarantine cannot enter the lockfile

**Status:** GREEN LIGHT 2026-09-11 · **Timebox:** 25 min of execution

## Context

D-07's spike found that the project runs versions the quarantine would refuse (CC-08). Measured
2026-09-11 with a scratch script that reads `bun.lock` and asks the registry for each version's publish
time:

- 64 of the 437 locked versions are younger than 7 days;
- 13 of them are orval's reviewed exception (CC-05);
- the other 51 are:
  - 19 `@oxlint/*` and 16 `@rolldown/*` binaries;
  - 3 `@types/*`;
  - `react`, `react-dom`, `scheduler`, `vite`, `rolldown`, `oxlint`, `zod`, `obug`, `node-releases`,
    `electron-to-chromium`, `hono` and `jose`.
- All 51 entered on 2026-09-10 between 16:00 and 16:08, through plan 01's commits. That is before
  `972e04b` switched the quarantine on at 19:44.
- The last of them, `vite` 8.3.0, leaves the quarantine on 2026-09-17 at 11:30 UTC.

Bun's quarantine itself holds. The spike's lockfile was resolved today, with the quarantine on, and 0 of its
375 versions are young, transitive ones included. So the gap is not Bun's resolver. It is anything that
writes the lockfile without that resolver:
- the state from before the quarantine;
- a warm cache (CC-02, closed since);
- another tool that writes the lockfile;
- a hand edit.

Nothing checks the lockfile itself. The author asked for such a check on 2026-09-11.

Serves: CC-08, QR-24, D-23 (amended), QR-23.

## Approach

- **What is checked.** The versions a commit adds to `bun.lock`: every `name@version` in the staged
  lockfile that HEAD's lockfile does not have.
  - For each one, the gate asks the registry for its publish time.
  - A version younger than `minimumReleaseAge` fails the commit, and the message names it, its age and the
    date it leaves the quarantine.
  - A name listed in `minimumReleaseAgeExcludes` passes. Those are the reviewed exceptions, and the gate
    reads them from `bunfig.toml`; it keeps no second list.
- **Why only what the commit adds.** The whole lockfile is 437 versions and 256 MB of registry metadata
  (4.4 s here). On every commit that is waste. Today it would also fail on 51 versions that leave the
  quarantine by themselves within a week. A version already in the lockfile was checked when it arrived,
  from this plan on.
- **Where it runs.** In pre-commit, when `bun.lock` is staged, before the Docker gate.
  - It is `scripts/check-lockfile-age.mjs`: Node, no package.
  - With `--all`, it checks the whole lockfile. The update recipe (QR-25) runs it at the start of each
    batch.
  - Node's `fetch` ignores the proxy unless `NODE_USE_ENV_PROXY=1` is set (found in D-07's spike). The hook
    sets it; outside the sandbox it changes nothing.
- **If the registry is unreachable,** the gate fails, with a message, rather than passing unchecked.
  `bun audit` in `check` already needs the registry.
- **The 51 versions already in the lockfile.**
  - They get no exception list. They are already locked, so a check of what a commit adds never sees them.
  - CC-08 records them, with the measurement.
  - `--all` passes from 2026-09-17 at 11:30 UTC.
- **D-23** gains a dated amendment. `CLAUDE.md` gains the gate in its hooks bullet and `--all` in the
  update recipe.

## Steps

1. The script, its line in the hook, the D-23 amendment, the addition to CC-08 and the `CLAUDE.md` lines.
   This is one commit, because a gate lands together with a tree that passes it.
2. Wrap-up as usual.

## Verification

- The gate is proven by deliberate cases (QR-23). The script takes `--base` and `--head` lockfiles for
  this, and each case is quoted in the log:
  - a lockfile that moves `vite` from 8.2.2 to 8.3.0 fails, and names `vite@8.3.0`;
  - the same move for `orval` 8.31.0 passes, because orval is a reviewed exception;
  - an unchanged lockfile passes without a single request;
  - an unreachable registry fails.
- `--all` on today's lockfile lists exactly CC-08's 51 versions, plus orval's 13 marked as excluded.
- The full `check`, then `/code-review` and `/security-review` on the plan's diff.

## Out of scope

- Replacing the 51 versions with older ones. That is a package change, and they leave the quarantine
  within a week.
- A full scan in `check` or pre-push: 256 MB on every run.
- CI (DR-9), where a nightly full scan belongs.

## Timebox

25 minutes. The cut order: `--all` goes first, and the full scan stays a manual command in the log.
