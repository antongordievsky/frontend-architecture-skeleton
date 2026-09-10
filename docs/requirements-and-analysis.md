# Requirements and Analysis — the frontend foundation

> **How to read this.** Part I fixes *what* must be true and *why*, before any tool is chosen. Part II
> records each decision, judged against Part I, with its rejected alternatives. Part III slices the work
> into plans (`docs/plans/`). Every requirement has an ID; every decision cites the IDs it answers to.
> A decision that cannot name a requirement is decoration. `ARCHITECTURE.md` is the one-page summary;
> this is the long version.

**Status:** Part I agreed · Part II open, filled just in time per plan · Part III draft
**Started:** 2026-09-10

---

# Part I — Requirements

## 1. Context

**Product.** Crypto tax reporting. Users connect wallets and exchanges, the product imports their
transactions, they review their portfolio and generate tax reports.

**Assignment.** The architectural skeleton of a brand-new frontend: structure, boundaries, the seams
(API, state, routing, design system) and quality tooling. Business logic is explicitly not wanted;
placeholder data and stub pages are fine. The task itself is in [`README.md`](../README.md).

**Actors the product serves.**

| Actor | Zone | Needs |
|---|---|---|
| Visitor | public — landing, sign-in, sign-up | fast first paint, SEO for the landing, minimal JavaScript, none of the app's internals in its bundle |
| User (taxpayer) | app — dashboard, transactions, reports, settings | data-heavy screens over thousands of rows; correctness of every amount |
| Support / internal team | admin — user lookup, import status, failures | a simple internal tool; stricter access; same design language |

Further roles are expected (e.g. an accountant working across several clients' accounts), which is why
access is modelled as permissions, not as a fixed list of roles (DR-3).

**Readers of this repository.** The company's reviewers (the five criteria in §7); interviewers who will extend
the code live with the author; a new hire — the "could they find their way without a tour" test.

**Sources.**

| ID | Source | Used for |
|---|---|---|
| S1 | The task ([`README.md`](../README.md)) | constraints, functional requirements, evaluation criteria |
| S2 | the company's public posting for Staff Frontend Engineer | quality bar, host stack, domain pressure |
| S3 | Reviewer feedback on the author's previous frontend take-home (scored 8/10) | strengths to keep, gaps turned into requirements |
| S4 | The author's prior engineering work and principles | how decisions are made and recorded |
| S5 | The author's best-practice notes (TypeScript, React, frontend architecture, data tables, testing) | the baseline for TS/React discipline and table design |

## 2. Hard constraints

| ID | Constraint | Implication |
|---|---|---|
| C-1 | TypeScript | strict; the rest of the toolchain is open (S1) |
| C-2 | One command: `docker compose up`, then reachable in a browser; no other setup | boots from a clean clone on a machine with only Docker — no host runtime, no `.env` step. Governs *running* the app; verifying it (`check`) must also be possible in Docker (FR-6) |
| C-3 | Repository from "Use this template"; README with how to run | the README is part of the deliverable |
| C-4 | `ARCHITECTURE.md`, about one page | layers and why; what stops erosion; what was skipped and what comes next |
| C-5 | ~3–4 h of scope; cut deliberately and say so | execution target 1.5–2 h; plans ordered must → stretch, cut from the bottom (Part III) |
| C-6 | The author owns every line | every decision explainable, every recipe executable by hand, live |

## 3. Scope tiers

A skeleton that builds everything is over-engineered; a skeleton that ignores what is coming is naive.
Every requirement sits in one tier:

- **Build now** — present and working in the skeleton (FR, QR).
- **Design for** — not built; the architecture accommodates it, the seam that makes it cheap exists
  where it costs little, and `ARCHITECTURE.md` says where it lands (DR).
- **Out of scope** — neither built nor designed for, with a stated reason (§10).

## 4. Functional requirements — build now (S1)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-1 | **Project structure**: features, shared components and cross-cutting concerns organised so a new developer knows where code belongs | `ARCHITECTURE.md` gives each top-level `src/` folder a one-line purpose and a "where does X go" table: a page, an API resource, a UI primitive, a shared composite, a domain type, a cross-cutting concern |
| FR-2 | **Dependency boundaries**: layers, one import direction, **enforced, not documented** | an upward or sideways import fails `lint` with a message naming the rule; each rule proven by a deliberate violation; lint runs in the pre-commit hook and in `check` |
| FR-3 | **API layer**: fetching, caching and typing of server data; the backend is mocked | no hand-written type describes a server payload; a contract change breaks compilation at the affected call sites; mocks are typed from the same contract; transport, base URL and cache policy each have one home; errors reach the UI as one typed shape |
| FR-4 | **Routing**: representative routes | dashboard, transactions, settings, not-found; route and search parameters typed |
| FR-5 | **UI foundation**: design-system primitives separated from product code | primitives in one layer that imports no product code; product code cannot import the underlying UI library directly (lint); tokens are the single source of colour, spacing, type; raw interactive elements banned outside the primitive layer (lint) |
| FR-6 | **Quality tooling**: TS config, linting, example tests showing how testing works here | one `check` command runs typecheck, lint, format check, contract drift, tests; runnable on the host and inside Docker with one command; tests demonstrate the layer model — at least a unit test on domain logic and an integration test of the example page against the mocked API |
| FR-7 | **Thin example page**: transactions list backed by the mocked API | data flows through the real API layer; loading, error, empty and data states handled; covered by the FR-6 integration test; runs against the large dataset of QR-6 |
| FR-8 | **Documentation**: README (C-3) and `ARCHITECTURE.md` (C-4) | a reader can run the app and explain its layers from these two files alone |

## 5. Quality requirements — build now

### 5.1 Correctness and types

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-1 | **Type safety for financial data.** Impossible states unrepresentable; every variant handled exhaustively | S2: expert TypeScript is a hard gate *because* "almost correct" is unacceptable with financial data | transaction kinds are a discriminated union with compiler-checked exhaustiveness; mixing incompatible amounts (two assets, asset vs fiat) fails to compile — shown by a type-level test |
| QR-2 | **Money representation.** Amounts are integers in the smallest unit, never a JS `number` with a fraction | floats lose value silently (`0.1 + 0.2`); crypto precision exceeds `Number.MAX_SAFE_INTEGER` (ETH has 18 decimals) | crypto amounts are integer base units with the asset's `decimals` attached; fiat amounts are integer minor units with the currency attached; on the wire amounts are decimal strings, parsed once at the API boundary; rounding happens only at an explicit, named step; formatting only at the render boundary; unit tests cover parsing, 18-decimal values and rounding |
| QR-3 | **TypeScript strictness and conventions, enforced** | S2 hard gate; S5 baseline | `strict` plus the stricter flags agreed in D-22 (candidates: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly` — which makes `enum` and `namespace` compile errors); `any` and non-null `!` are lint errors; `as` only at documented boundaries; the `type`/`interface` convention decided once and lint-enforced; types derive from one source (`as const`, `satisfies`, generated contract types), never duplicated by hand |
| QR-4 | **React discipline** | S2: deep React is a hard gate — rendering, referential equality, state placement, React Compiler | code obeys the Rules of React (lint as errors, so the Compiler can optimise it); derived state computed during render, never synced through an effect; effects only synchronise with the outside world and clean up; list keys are entity ids; routes code-split; an error boundary inside the app shell; the four network states in one component |

### 5.2 Contract and data

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-5 | **End-to-end typing from a backend-agnostic contract** | the company's backend is Ruby; AI features plausibly arrive as a Python service — the seam must survive both | server types generated from the contract; drift fails `check`; adding a second service means adding a contract, not a new client stack; the contract here stands in for the backend's — in production it is pulled from the backend, not authored in the frontend |
| QR-6 | **Data-heavy readiness and a realistic mock dataset** | S2: massive datasets, thousands of transactions, DeFi reconciliation; S5: the client-vs-server threshold sits at a few thousand rows | the mock serves a deterministic, seeded dataset of ≥ 10 000 transactions across several kinds and ≥ 20 assets, including 8- and 18-decimal ones; the pagination/sorting/filtering model is decided in D-06 and implemented in the mock; latency and error injection are switchable |

### 5.3 Structure and enforcement

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-7 | **Enforcement over convention** | S1 criterion 2; S4 | every rule in `ARCHITECTURE.md` names the tool that enforces it; rules no tool can enforce are listed as such |
| QR-8 | **Pragmatism** | S1 criterion 4: over-engineering is a red flag; S4 | each dependency has a written reason; no empty folders; no abstraction without a present consumer; "design for" items are seams and paragraphs, not code |

### 5.4 Performance and observability

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-9 | **Performance budgets with regression tests, runnable on a slow machine** | the product is table-heavy; a regression on a 10 000-row screen is a product bug | a production bundle-size budget fails `check`; a browser perf test opens the transactions page on the QR-6 dataset under CPU and network throttling and asserts interaction budgets (numbers measured and fixed in D-20); the same throttled run is one command locally |
| QR-10 | **Observability and metrics through one seam** | S2 lists Sentry; a render failure nobody sees is a failure twice | one reporter module receives render errors, unhandled rejections, failed requests and Web Vitals (LCP, INP, CLS); in development it logs, and swapping the destination is a one-file change; financial data and PII are scrubbed at the seam — covered by a unit test |

### 5.5 Security

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-11 | **Security baseline, closed by tools wherever a tool exists** | financial data; secrets leak through repositories, bundles, logs and agent context; a control nobody runs is not a control | each control below is enforced by a tool chosen in D-21, and the few that no tool can enforce are named as such in `ARCHITECTURE.md`: secrets never committed (secret scanner in the pre-commit hook and `check`); `.env*` ignored, only `.env.example`; `VITE_*` treated as public; the agent cannot read `.env*` or credential files and they are excluded from the code index (agent settings); `dangerouslySetInnerHTML` and token storage (`localStorage`/`sessionStorage` outside one allowed module) are lint errors; untrusted data renders as text; dependency audit in `check`; frozen lockfile install; a CSP wherever the app is served in production mode (D-12), asserted by a test |

### 5.6 User experience

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-12 | **Accessibility and interaction quality, enforced** | S3: accessibility at a basic level, missing pointer states, shallow keyboard navigation; S2: engineers own visual and interaction quality — no dedicated designers | a11y lint rules are errors; automated axe checks run in the browser tests; the transactions page is operable by keyboard alone (e2e); interactive primitives carry the pointer cursor and a visible focus state by default; tables use semantic markup with `aria-sort` |
| QR-22 | **Cross-browser correctness** | S2: cross-browser correctness and pixel-level precision are the engineer's job | supported browsers declared once and used by the build; e2e smoke runs on Chromium and at least one other engine (D-09) |

### 5.7 Delivery hygiene

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-13 | **Reproducibility** — one package manager, one lockfile, a clean clone boots | C-2 | a fresh clone runs `docker compose up` green; installs are frozen from the lockfile with no flags; the runtime version is pinned in a file in the repository |
| QR-14 | **Formatting gate** | S3: lint without a formatter gate | unformatted code fails `check` |
| QR-15 | **Clean, narrated history** — trunk-based, conventional commits, each single-purpose and green | the history is part of what a reviewer reads | commit messages are linted; every commit passes every gate that exists at that commit, with no exceptions |
| QR-23 | **Tests and gates prove themselves** — nothing is trusted until it has been seen failing | a test that cannot fail, or a lint rule that matches nothing, is false confidence — worse than none | every behaviour change ships with its tests in the same commit; each new test and each new gate is shown to fail on a deliberate break before it is kept, and the plan log records the break; whether mutation testing automates this is decided in D-09 |
| QR-16 | **Decisions with their rejected alternatives** | S1 criterion 5; S4 | every Part II entry has options, disqualifiers, a "wrong if" condition |
| QR-17 | **Extensible live** — adding a page, an API resource, a primitive or a permission is a short recipe | C-6; interviewers extend the code | each recipe is ≤ 5 steps in `ARCHITECTURE.md` or README |

### 5.8 AI and tooling

| ID | Requirement | Why | Acceptance criteria |
|---|---|---|---|
| QR-18 | **AI usage deliberate and legible** | S3: reviewers read a production-scale AI layer on a take-home as over-engineering; S2 lists Claude, Codex, Cursor as team tools | the README explains in one paragraph what the AI layer is and why; no artefact exists without a consumer; built-in agent capabilities are preferred over custom ones |
| QR-19 | **Agent tooling baseline** — a structural code index and a browser the agent can drive | cuts research cost and guesswork; S3 showed interaction quality is only visible in a browser | CodeGraph and Playwright MCP start with the agent session via `.mcp.json`, pinned exactly, installed locally (no network fetch on session start); the index is derived and gitignored |
| QR-20 | **Generators over hand-written boilerplate** | hand-written scaffolding drifts from upstream defaults and hides what was authored vs generated | the exact generator command is recorded in the plan log and commit body; generated output and hand edits land in separate commits |
| QR-21 | **Alignment with the host stack** | a skeleton for their team should not create friction with their tools (S2) | every deviation from §8.1 is named and justified in Part II |

## 6. Design-for requirements — not built, accommodated

Each gets a short Part II decision (tier "design for"): where it lands, which seam exists now, what it
would cost.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| DR-1 | **Actor zones and rendering per zone.** Public, app and admin isolated from each other; the public zone can ship without app or admin code in its bundle and move to SSR/SSG without restructuring the app | isolation rules in lint for every zone that exists; `ARCHITECTURE.md` shows the path from one SPA to a separately built public zone |
| DR-2 | **Authentication — OAuth/OIDC, produced by standard tooling.** Social and email sign-in come from the backend's or identity provider's standard generators and SDKs, not hand-rolled flows; the browser holds an httpOnly session cookie, never a token; mutations CSRF-protected | the transport is the one place the credentials policy and the reaction to 401 live; the session is a typed server-state query (`/me`); no token-storage code exists (QR-11 lint) |
| DR-3 | **Authorization — permission-based, roles extensible.** Roles are server-side bundles of permissions; the frontend checks permissions, never role names; the server stays the enforcer (frontend gating is UX, not security) | `Permission` is a type generated from the contract; one typed `can()` check and one route guard; adding a role requires no frontend change; delegated access (acting for another account) not precluded |
| DR-4 | **Admin zone for support and the team** — user lookup, import status, failures | same design system; its own zone and stricter permissions; not built beyond what D-16 decides |
| DR-5 | **AI features as a separate service** (likely Python) | integrates through its own contract; streaming responses (SSE) not precluded by the transport |
| DR-6 | **Security with AI agents** — development time (agent permissions, secret isolation, vetting external skills and MCP servers) and product time (LLM features read untrusted imported data → prompt injection; least-privilege tools; no financial data to third-party models without consent) | a section in `ARCHITECTURE.md` § Next with the threat list and the first controls |
| DR-7 | **Monitoring destination and product analytics** — Sentry (S2) behind the QR-10 seam; a typed catalogue of product events | swapping the reporter destination is one file; events are a union type, not strings |
| DR-8 | **Mobile (React Native planned, S2)** — domain types and the contract client usable outside the web | the domain and API layers import no DOM and no React — lint-enforced |
| DR-9 | **CI/CD with agentic checks.** Deferred for the take-home (no PR flow; `check` and wrap-up reviews run locally). When it arrives: `check` per push; secret scan, dependency audit, e2e and perf jobs; agent reviewers (code, security) as PR gates with the same rubric used locally; a dependency update bot | `ARCHITECTURE.md` § Next lists the jobs, which local command each mirrors, and the agentic gates |

## 7. Traceability to the evaluation criteria (S1)

| S1 criterion | Answered by |
|---|---|
| 1. Clarity of structure | FR-1, FR-8, QR-17 |
| 2. Boundaries real (tooling) or folder names | FR-2, FR-5, QR-7, DR-1 |
| 3. Sound choices at the seams: API, state, routing, design system | FR-3, FR-4, FR-5, QR-5, QR-6, DR-2, DR-3 |
| 4. Pragmatism | QR-8, C-5, §3 tiers |
| 5. Reasoning in `ARCHITECTURE.md` | C-4, QR-16 |

## 8. Inputs — facts, not decisions

### 8.1 the company's stack (S2)

| Area | Stack |
|---|---|
| Core | React 19, React Compiler, TypeScript |
| Routing · server state · tables | TanStack Router · TanStack Query · TanStack Table |
| UI · styling | Radix UI, Mantine · Tailwind CSS v4, class-variance-authority, tailwind-merge |
| Build · runtime | Vite · Bun |
| Testing · component docs · visual regression | Vitest, Playwright · Storybook · Chromatic |
| Lint · format | oxlint · Biome |
| Charts · monitoring | Highcharts · Sentry |
| Data handling | csv-parse, SheetJS (xlsx), node-html-parser, blockchain libraries |
| Backend context | Ruby codebase, PostgreSQL, Redis (ioredis), RabbitMQ; Heroku; React Native planned |
| AI coding | Claude, Codex, Cursor |

The title says "Frontend", but the role touches a distributed data-processing backend. Hard gates in the
posting: expert TypeScript (because of financial data) and deep React. The Staff engineer is Product's
primary frontend partner and owns visual and interaction quality — there are no dedicated UI designers.

### 8.2 Feedback on the previous take-home (S3)

What reviewers valued — a current signal of what the frontend community rewards, kept as the baseline:

- a logical, readable structure (pages, feature components, UI kit, store, types) with clear decomposition;
- strong TypeScript: union types for UI states, no `any`, lint and typecheck passing;
- business logic beyond the minimum: store, progress with timer, selected/default state, error + retry,
  undo/redo, locking during generation;
- a polished loading flow; a deterministic mock; a non-template README (run, live demo, deploy, the
  lint-enforced import rules).

What they asked for — each became a requirement:

| Reviewers said | Became |
|---|---|
| No `cursor: pointer` on interactive elements | QR-12 |
| A linter, but no formatter as a gate | QR-14 |
| Too many production-grade AI artefacts for the size of a take-home | QR-18 |
| Accessibility at a basic level; keyboard navigation shallow; interactive elements not fully checked | QR-12, QR-19 |

### 8.3 Best-practice baseline (S5)

- **TypeScript:** invalid states unrepresentable (discriminated unions); `unknown` at the edges, narrowed
  by guards, never `any`; a `Result` union for expected domain failures; `never`-exhaustiveness in every
  `switch`; `as const` and derivation from one source of truth; unions of literals over `enum`; no `!`;
  branded domain types (`AssetId`, base units).
- **React:** derive during render; effects only to synchronise, always cleaned up, requests aborted on
  race; measure before memoising; virtualise long lists; `useDeferredValue`/`useTransition` for heavy
  input; code-split per route; error boundaries around fragile subtrees.
- **Architecture:** server state and client state are different problems; one API layer owns base URL,
  headers, errors, retries; rendering model chosen per surface; caching exists at several levels and the
  invalidation owner is named; a BFF when the UI talks to many services.
- **Data tables:** client-side processing up to a few thousand rows, server-side beyond; row
  virtualisation for 10 000+; cursor pagination is stable under inserts; `Set` for selection; semantic
  table with `aria-sort`; virtualisation trades away Ctrl-F and print.
- **Testing:** the trophy — static, thin unit, broad integration, thin e2e; behaviour, not
  implementation; mock the network at the boundary, not internal functions; fake timers for time;
  contract tests where teams or services meet.

### 8.4 Principles the decisions are made by (S4)

- A boundary nobody can violate beats one everybody agrees with.
- Measure, do not recall — versions, sizes and behaviour come from a command run now.
- No structure that lies — no empty folder, no layer whose every tenant has one consumer.
- Promotion on the second consumer, not in anticipation of one.
- One owner per cross-cutting concern (transport, retries, config, the UI kit, notifications, telemetry).
- Write for a cold reader: why, current state, decision with rejected alternative, pointers, next actions.

## 9. Domain notes

- **Entities:** connection (wallet or exchange), transaction, asset, amount, fiat valuation, tax report,
  user, role, permission.
- **Modelled in code now:** `Transaction` as a union of kinds (e.g. deposit, withdrawal, trade, transfer,
  staking reward) and an asset-denominated `Amount` (QR-1, QR-2). Everything else is a stub.
- **Risks the structure must not preclude:** per-asset precision (BTC 8 decimals, ETH 18); rounding
  policy; fiat valuation at transaction time; tax-year boundaries across timezones; duplicate, missing and
  partially imported transactions; immutable history; reconciliation across thousands of rows.

## 10. Out of scope — by decision

Neither built nor designed for, each for a stated reason (finalised in Part II and `ARCHITECTURE.md`
§ Skipped): a real backend or BFF (the task asks for a mock; the seam is the contract); tax calculation;
import pipelines (CSV/XLS parsing); charts; i18n; hosting and deployment. Storybook and visual regression
are open (D-14), not assumed.

---

# Part II — Analysis and decisions

**Method.** Requirements are fixed first (Part I). Decisions are made **just in time**: before plan N
starts, `/staff direction` produces the decisions that plan needs, one at a time, measured rather than
recalled; each becomes `Accepted` only after the author confirms it. An `Accepted` entry is a hard
constraint; changing it is an amendment written here, agreed first.

**Entry format.** Short on purpose — at most 12 lines, and at most 5 for a "design for" entry.

```
### D-NN — <question>            Status: Open | Proposed | Accepted     Needed by: plan NN
Judged by: C-, FR-, QR-, DR- IDs            Tier: build now | design for
Options:   A / B / C — measured facts (version, release date, size, spike) with their source
Disqualifiers: why each rejected option lost — a specific reason, not a general weakness
Decision:  one sentence
Wrong if:  the condition under which this decision becomes the wrong one
Consequences: what gets easier / what gets more expensive, concretely
```

## Register

| ID | Open question | Judged by | Needed by |
|---|---|---|---|
| D-01 | Repository and application shape (single app or workspace; where contract and domain live) | QR-8, QR-5, DR-1, DR-8, C-2 | plan 01 |
| D-02 | Package manager and runtime | QR-13, QR-21, C-2 | plan 01 |
| D-12 | What `docker compose up` serves (dev server vs production build); `check` in Docker | C-2, FR-6, QR-11, QR-13 | plan 01 |
| D-22 | TypeScript configuration and conventions (flags, `type` vs `interface`, enums, casts) | QR-1, QR-3 | plan 01 |
| D-13 | React Compiler | QR-4, QR-21 | plan 01 |
| D-10 | Lint, format, hooks, commit conventions | FR-2, QR-7, QR-14, QR-15 | plan 02 |
| D-21 | Security tooling and agent guardrails | QR-11, DR-6 | plan 02 |
| D-16 | Actor zones and rendering strategy per zone | DR-1, DR-4, QR-8 | plan 03 |
| D-03 | API contract and typing pipeline; runtime validation at the boundary | FR-3, QR-1, QR-5 | plan 04 |
| D-08 | Representation of amounts and assets | QR-1, QR-2 | plan 04 |
| D-04 | Mocking strategy and the dataset generator | FR-3, QR-6, QR-11, C-2 | plan 04 |
| D-17 | Authentication architecture (design for) | DR-2, QR-11 | plan 04 |
| D-09 | Testing strategy and environments (unit, component/integration, e2e, browsers in Docker); proving tests fail — manual deliberate breaks vs mutation testing (input: Stryker 10.0.0 with a Vitest runner, measured 2026-09-10) | FR-6, QR-12, QR-22, QR-23 | plan 04 (first tests) |
| D-05 | Routing | FR-4, QR-3, QR-21 | plan 05 |
| D-18 | Authorization model (design for, guard seam) | DR-3, QR-17 | plan 05 |
| D-07 | UI foundation: kit, styling model, tokens | FR-5, QR-12, QR-21, QR-22 | plan 06 |
| D-14 | Storybook and visual regression | FR-5, QR-8, QR-21 | plan 06 |
| D-06 | State placement (server, URL, client) and the table's data model | FR-3, FR-7, QR-6 | plan 07 |
| D-19 | Observability and metrics | QR-10, DR-7 | plan 08 |
| D-20 | Performance strategy and budgets | QR-9, QR-6 | plan 08 |
| D-11 | CI/CD with agentic checks (design for) | DR-9, QR-15 | plan 09 |
| D-15 | Extent of the AI layer (commands, agents, MCP beyond the baseline) | QR-18, QR-19, QR-8 | plan 09 |

## Decisions

*None yet — entries are added here, in the format above, as each plan's decisions are made.*

---

# Part III — Delivery

Draft order, finalised as each plan is written. **Cut line:** plans 01–07 are the must-have skeleton;
08–09 are stretch, except the documentation in 09, which is must. If a timebox is exceeded, the cut is
taken from the bottom and recorded in `ARCHITECTURE.md` § Skipped.

| Plan | Slice |
|---|---|
| 01 | Scaffold: app shape, runtime, Docker, TS config, agent tooling (CodeGraph, Playwright MCP) |
| 02 | Gates: lint, format, hooks, commit lint, security tooling, `check` |
| 03 | Boundaries: layers and zones, lint rules proven by deliberate violations |
| 04 | Contract and API layer: contract, codegen, typed transport, amounts, typed mocks, dataset |
| 05 | Routing: shell, routes, typed params, permission guard seam |
| 06 | UI foundation: tokens, primitives, a11y defaults |
| 07 | Transactions page: table over 10 000 rows, four states, tests across the trophy |
| 08 | Observability seam and performance budgets (stretch) |
| 09 | `ARCHITECTURE.md`, README, AI-layer paragraph, final review |
