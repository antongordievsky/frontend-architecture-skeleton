# Plan 05a — A version younger than the quarantine cannot enter the lockfile

**Status:** done 2026-09-11 — GREEN LIGHT 2026-09-11 · **Timebox:** 25 min of execution

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

## What happened

Executed 2026-09-11 on `build/05a-lockfile-age`, from 19:24 to 19:29 by the commits' timestamps. That is
inside the timebox, and nothing was cut. Two commits:
- `e3bf162` — the plan;
- `55a74b7` — the gate, its line in the hook, the D-23 amendment, CC-08's addition and `CLAUDE.md`.

**Deviations and surprises**

- *D-23 already knew part of CC-08.* Its evidence records oxlint 1.82.0, then 3 days old, passing a frozen
  install, and concludes that the quarantine guards additions, not reinstalls. So CC-08's "Assumed"
  overstated what was unknown. What was unknown was the scale: 51 versions, `react` and `vite` among them.
  - The entry is not rewritten. A dated addition says so (course corrections keep their history).
- *The message for an unreachable registry* first read only "fetch failed". It now adds the cause, which
  was "bad port" in the proof.
- *The hook's wiring was proven after the commit.* The hook refuses to run while the tree holds unstaged
  changes, so its proof needs a tree with nothing but the staged lockfile.
- *A wrap-up script in this session misread exit codes.* It used bash's `PIPESTATUS`, and the agent's
  shell is zsh, so the variable came back empty. The commits made that way were verified from `git log`
  and the clean tree, not from the variable.

**Proof (QR-23)** — each case run on purpose, with the outcome seen:

| Case | Run | Seen |
|---|---|---|
| a lockfile adds a young version | `--base` a copy with `vite@8.2.2`, `--head` today's lockfile | exit 1: "1 locked version(s) younger than the quarantine … vite@8.3.0 — published 2026-09-10T11:30:26.283Z, 1.2 days ago; it leaves the quarantine at 2026-09-17T11:30:26.283Z" |
| a reviewed exception | the same with `orval@8.28.1` | exit 0; orval@8.31.0 listed under "named in minimumReleaseAgeExcludes" |
| nothing added | the same lockfile twice, `--registry http://127.0.0.1:9` | exit 0: "the lockfile adds no version", with no request made |
| the registry cannot be reached | the vite case, `--registry http://127.0.0.1:9` | exit 1: "these could not be checked … vite: fetch failed (bad port)" |
| the whole lockfile | `--all` | exit 1: exactly 51 young versions, plus orval's 13 marked as excluded, matching CC-08 |
| the hook runs the gate | `bun.lock` staged with `@tanstack/react-router@1.170.35`, then `sh .githooks/pre-commit` | exit 1 at the gate, before `check`: "…@tanstack/react-router@1.170.35 — published 2026-09-10T18:20:25.080Z, 1.0 days ago…"; `bun.lock` restored afterwards |

**Verification**

- The full `check` passed at `55a74b7`, through pre-commit:
  - format and lint;
  - both drift gates;
  - typecheck;
  - 64 tests;
  - the build;
  - no leaks;
  - `bun audit` clean at 413 packages.
- The default mode, with no lockfile staged, reports "the lockfile adds no version" (exit 0).

**Reviews at wrap-up**

- `/code-review` — two findings, both real and both fixed, in the commit after the gate's.
  1. *Medium: an entry was identified by `name@version` alone.* A hand edit could point a locked version
     at another registry, which is bun.lock's second field, or swap its integrity hash. The gate would
     then check npmjs's copy, or not see the change at all. Now:
     - an entry that resolves from anywhere but the default registry fails;
     - an entry is identified by its version and its integrity together;
     - the locked hash must equal the registry's.
  2. *Low: any failure of `git show :bun.lock` read as "no lockfile".* So the gate passed without checking
     anything. Now only a lockfile that does not exist, or a missing HEAD, reads as empty; any other git
     error fails the gate.
  - *Proof.* Each case was run on the gate as first committed and on the fixed one:

    | Case | Before | After |
    |---|---|---|
    | `vite@8.3.0` pointed at another registry | exit 0, "the lockfile adds no version" | exit 1, "vite resolves from https://other.registry/, not the default registry" |
    | `react-dom@19.3.0`'s hash swapped | exit 0 | exit 1, "the locked integrity is not the one the registry publishes" |
    | `GIT_DIR=/nonexistent` | exit 0 | exit 1, "git could not read :bun.lock: fatal: not a git repository" |

    The six proofs above gave the same results again. `--all` also found each of the 437 locked hashes
    equal to the registry's.
- `/security-review` — it read the gate as first committed (`55a74b7`), before the fix above, and
  found two ways past it. Each was measured on the fixed gate before anything else was changed.
  1. *A foreign tarball URL in the registry slot, confidence 9.* Already refused by the fix above
     (exit 1, "lodash resolves from https://evil.example/lodash-evil.tgz").
  2. *The id read differently from Bun, confidence 7.* The gate split an id at its last `@`, and checked
     only that the version began with `x.y.z`. So `lodash#@https://evil.example/x.tgz?@4.17.21` read as
     lodash 4.17.21, and the `#` cut the registry request down to `/lodash`.
     - The reviewer's lockfiles for it are tarball entries, `[id, {}]`. The fixed gate already refused
       them, because the registry slot was not `""`.
     - One variant still passed: the same id in the registry shape `[id, "", {}, <lodash 4.17.21's real
       hash>]` gave exit 0.
     - *Not a bypass today.* In Bun 1.4.2's parser (`bun.lock.rs` and `dependency.rs` at tag
       `bun-v1.4.2`), Bun splits at the first `@` after the scope and reads that id as a remote tarball.
       A tarball has no registry slot, so the `""` fails with "Expected an object". The install would
       stop.
     - *Fixed anyway* (`aab470a`), because otherwise the gate relies on Bun's other checks. It now splits
       the id where Bun does, and accepts only a plain package name and an exact, end-anchored version.
     - *Proof:*
       - the variant gave exit 0 before the fix and exit 1 after it: "is locked as …, which is no registry
         version";
       - `"lodash@4.17.21 "`, with a trailing space, is now refused at the id;
       - the reviewer's three lockfiles still give exit 1;
       - eight of the earlier proofs were rerun and gave the same results;
       - `--all`: all 437 locked ids pass the new rule, and it still reports exactly 51 young plus 13
         excluded.
  - *Deviation from the skill.* It asks for a false-positive sub-task for each finding. Instead, each one
    was measured: the reviewer's lockfiles were run against the fixed gate, and Bun's source was read. A
    measurement settles more than a second reading of the code.
  - *Noted, not done:*
    - Merges, rebases, cherry-picks and `git am` do not run pre-commit, and neither `check` nor pre-push
      runs this gate. A pre-push check of what the pushed range adds would close that. It belongs with CI
      (DR-9), like `--no-verify`.
    - With duplicate keys, `JSON.parse` keeps the last one. Which one Bun keeps was not checked.
