# Plan 00 — Requirements first, and the working agreement

**Status:** done · **Date:** 2026-09-10 · **Timebox:** analysis, outside the 1.5–2 h execution budget
**Serves:** QR-15, QR-16, QR-18, QR-20, QR-23 · **Commits:** `6675107`, `9a656ca`, `3cad1bf`, `f9a26da`

## Why this plan exists

The repository started empty: the task's `README.md` and nothing else. The tempting move was to scaffold
a familiar stack and start typing. That would have produced a skeleton, but not the thing the task
actually scores — reasoning at the seams, boundaries that are real, and pragmatism that is visible.

So this plan writes no code. It fixes, in order: what must be true (requirements), how decisions get
made (just in time, per plan, with rejected alternatives), and how work reaches `main` (the working
agreement). Every later plan is judged against these three.

## What it delivered

- `docs/requirements-and-analysis.md` — Part I: constraints (C-), functional (FR-), quality (QR-) and
  design-for (DR-) requirements with acceptance criteria, traceability to the task's evaluation
  criteria, and the inputs they came from. Part II: the register of open decisions, each tied to the
  requirements that judge it and the plan that needs it. Part III: the draft slicing with a cut line.
- `CLAUDE.md` — the working agreement: workflow, the orchestrator's stop conditions, the testing rule,
  generators first, git, security, scope control, AI tooling.
- `.gitignore` and `.claude/settings.json` — env files out of git and out of the agent's reach;
  destructive commands denied.
- `.claude/commands/staff.md` — the one custom agent command: decisions and plan reviews.

## Process decisions taken here

These are about how the work is done, not about the stack, so they live here rather than in Part II.

| Decision | Rejected alternative | Why |
|---|---|---|
| Requirements before any tool is chosen | Pick the stack first, justify it after | a justification written after the choice cannot lose; requirements written first can reject a favourite |
| Decisions just in time, per plan | All 22 decisions up front | a waterfall: slow, and it decides things with less information than the plan that needs them will have |
| Three tiers: build now / design for / out of scope | Build everything the product will need | QR-8 — a skeleton that builds OAuth, roles and SSR is over-engineered; one that ignores them is naive |
| Trunk-based, local-first: short branch per plan, fast-forward to local `main`, one push at the end | Pull requests with CI per plan | one author, no reviewers mid-way: a PR flow would be ceremony; CI is recorded as a deferred decision (DR-9) |
| Every commit passes every gate that exists at that commit, no exceptions | Allow a temporarily red commit after a generator runs | a history with red commits cannot be bisected or trusted; a commit that adds a gate fixes the tree in the same commit |
| Tests and gates prove themselves by a deliberate break before they are kept | Trust a green run | a test that cannot fail, or a lint glob that matches nothing, is false confidence (QR-23) |
| Security closed by tools wherever a tool exists | A checklist in the README | a control nobody runs is not a control (QR-11) |
| One custom command (`/staff`); built-in `/code-review` and `/security-review` at wrap-up | Custom `qa` and `review-security` agents, as in earlier projects | QR-18 — the previous take-home's reviewers read a production-scale AI layer as noise |
| CodeGraph and Playwright MCP arrive with plan 01, not here | Install them now | installing creates a lockfile, and the package manager is D-02; a temporary second lockfile would break QR-13 |

## Red team — gaps found in the draft, and how they were closed

| # | Finding | Resolution |
|---|---|---|
| 1 | "All decisions first, then plans" is a waterfall | decisions are made per plan; the register has a "Needed by" column |
| 2 | "Every commit green" contradicted "generated code in its own commit" and the docs-only commits made before `check` exists | every commit passes the gates that exist at that commit; a commit introducing a gate makes the tree pass it |
| 3 | A test never seen failing may check nothing — the same for a lint rule that matches nothing | QR-23: each new test and gate is proven by a deliberate break, recorded in the plan log; automation (mutation testing) is D-09 |
| 4 | Without CI, requirements saying "fails CI" had no owner | the gate is the local `check`, run in full at wrap-up, with a pre-push hook as backstop; CI/CD is DR-9 |
| 5 | C-2 allows only Docker, but hooks and `check` need a runtime | C-2 governs running the app; `check` must also run in Docker with one command (FR-6) |
| 6 | Browser tests need browsers inside Docker | a separate compose profile on the official Playwright image — D-09 / D-12 |
| 7 | The mock could end up in the production bundle | D-04 is also judged by QR-11: the mock is a separate layer excluded from real builds |
| 8 | The job posting names cross-browser correctness; no requirement covered it | QR-22 |
| 9 | Self-review by the orchestrator is biased and there is no CI | built-in `/code-review` and `/security-review` on each plan's diff |
| 10 | 22 decisions and a long document could read like the "11 ADRs" of the previous take-home | Part II entries are capped (12 lines, 5 for design-for); `ARCHITECTURE.md` is the reviewer's entry point |
| 11 | 1.5–2 h is not enough for everything listed without a cut rule | plans ordered must → stretch; overruns cut from the bottom, recorded in `ARCHITECTURE.md` |
| 12 | The contract is authored here, although a backend owns it in reality | QR-5: the contract stands in for the backend's; in production it is pulled from the backend |
| 13 | "Tokens never in JS" had no enforcing tool | lint bans `localStorage`/`sessionStorage` outside one allowed module |
| 14 | Session expiry (401) had no owner | the transport is the one place that reacts to 401 (DR-2) |
| 15 | Runtime versions were not pinned | QR-13: the runtime version is pinned in a file in the repository |

## Verification

- `git check-ignore` reports `.env`, `.env.local`, `.env.production.local` as ignored, `.env.example`
  as not (exit 1).
- `.claude/settings.json` parses as JSON.
- Every relative Markdown link in the three documents resolves.
- `git log --oneline`: four conventional commits on top of `d7f1733`, linear, local only.

## What happened

- Three review rounds with the author before GREEN LIGHT. They added: the tiers; money, performance,
  observability, security and access-control requirements; the actor zones; the testing rule without
  exceptions; generators first; Playwright MCP; the red-team pass above.
- Measured while planning (2026-09-10, `npm view`): `@optave/codegraph` 3.17.0 (Node ≥ 22.12),
  `@playwright/mcp` 0.0.80, `@stryker-mutator/core` 10.0.0 with a Vitest runner.
- **Deviation:** the commit order changed. `CLAUDE.md` was committed last instead of second, because it
  refers to `.claude/settings.json` and `/staff`; committed earlier, it would have pointed at files not
  yet in the tree.
- This file was added afterwards, at the author's request, so the plan that shaped everything else is
  readable in the repository like the ones that follow it.

## Next

Plan 01 (scaffold) needs D-01, D-02, D-12, D-22 and D-13 — decided one at a time with `/staff direction`
before plan 01 is written.
