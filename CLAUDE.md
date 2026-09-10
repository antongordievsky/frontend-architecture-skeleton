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
| Typecheck only | `mise exec -- bun run typecheck` |
| Refresh the code index | `mise exec -- bun run graph:update` (`graph:build` rebuilds from scratch) |

- `WEB_PORT` and `PROD_PORT` override 5173 and 8080 when they are taken.
- `check` grows with each plan: today typecheck and build; lint and format arrive in plan 02, tests in
  plan 04.
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
  built-in `/code-review` and `/security-review` on the plan's diff; fix or record findings → append
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
  No pull requests and no CI for this take-home: the local `check` is the gate, and a pre-push hook runs
  the full `check` as a backstop. CI/CD is a deferred decision (DR-9).
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
- Everything else in the AI layer is decided in D-15 and exists only with a consumer (QR-18).
