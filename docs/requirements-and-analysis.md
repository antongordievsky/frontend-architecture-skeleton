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
| FR-2 | **Dependency boundaries**: layers, one import direction, **enforced, not documented** | an upward or sideways import fails `lint` with a message naming the rule — type-only imports and type re-exports included, because a type shared across modules couples them as surely as code; a module's types are private to it: pages never import one another, not even types, and shared types live in the domain or come from the contract; each rule proven by a deliberate violation; lint runs in the pre-commit hook and in `check` |
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
| QR-11 | **Security baseline, closed by tools wherever a tool exists** | financial data; secrets leak through repositories, bundles, logs and agent context; a control nobody runs is not a control | each control below is enforced by a tool chosen in D-21, and the few that no tool can enforce are named as such in `ARCHITECTURE.md`: secrets never committed (secret scanner in the pre-commit hook and `check`); `.env*` ignored, only `.env.example`; `VITE_*` treated as public; the agent cannot read `.env*` or credential files and they are excluded from the code index (agent settings); `dangerouslySetInnerHTML` and token storage (`localStorage`/`sessionStorage` outside one allowed module) are lint errors; untrusted data renders as text; dependency controls per QR-24; a CSP wherever the app is served in production mode (D-12), asserted by a test |
| QR-24 | **Dependency supply chain, closed by tools.** A package enters only deliberately, runs no code at install unless trusted, and arrives only after a quarantine | packages are an attack surface: hijacked maintainer accounts publish malicious patch versions, install scripts steal tokens and spread, and AI assistants invent package names that attackers then register ("slopsquatting") — the agent working in this repository is one more way in | a new package needs the author's explicit approval (agent settings: package commands always ask) and a written reason (QR-8); before proposing one, the agent verifies it in the registry and its repository — exact name, age, maintainers, provenance, and maintenance health: recent releases, recent human commits, maintainers answering issues; popularity is not maintenance (CC-01); install scripts are blocked except an explicit trust list; versions younger than a quarantine period are not installed; a vulnerability audit runs in `check`; installs are frozen and every lockfile change is visible in the diff; tools and numbers are decided in D-23 |
| QR-25 | **Dependencies kept fresh on purpose.** Frozen installs stop silent drift, so updating becomes a deliberate, regular job | a lockfile nobody updates ages into known vulnerabilities — staleness is a security risk too | updates run on a cadence, in batches, each batch through `check`; majors one at a time with the changelog read; a security fix may bypass the quarantine after a manual review; the update recipe is one documented command; an update bot is part of DR-9 |

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
| DR-9 | **CI/CD with agentic checks.** Deferred for the take-home (no PR flow; `check` and wrap-up reviews run locally). When it arrives: `check` per push; secret scan, dependency audit, e2e and perf jobs; agent reviewers (code, security) as PR gates with the same rubric used locally; a dependency update bot with the QR-24 quarantine, grouped updates, and auto-merge of patch updates only when `check` is green | `ARCHITECTURE.md` § Next lists the jobs, which local command each mirrors, and the agentic gates |
| DR-10 | **AI tooling for the project's developers.** Skills and generators that produce new pages, API resources, primitives and tests to this repository's standards, so the standards are applied by construction rather than remembered. Not built now: the standards have to settle first, and building it here would be the over-engineering QR-8 and QR-18 warn against | `ARCHITECTURE.md` § Next names the first candidates — one generator per QR-17 recipe — and how their output is held to the same lint rules and gates as hand-written code |
| DR-11 | **Development process and environment parity.** How work moves between local development, the local production mode, CI, staging and production, and how close each is to production — hardware included: a test that passes on a fast laptop can fail on the slow CPUs production and CI often run on (S4). Recorded now, decided together with CI/CD | `ARCHITECTURE.md` § Next lists the environments, what each one proves, and how hardware parity is approximated (throttling, QR-9) |

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

**Entry format.** Built for review: the title says what is being chosen, a short context says why it
matters, the trade-offs are a table a reviewer can scan, and the conclusion is four bullets. A "design
for" entry may drop the table and keep Decision, Wrong if and Where it leads. Decision and Where it
leads are written to be lifted into `ARCHITECTURE.md` as they are — that file is assembled from them.

```markdown
### D-NN — <the choice, as a question a product manager would understand>

`Open | Proposed | Accepted` · needed by plan NN · build now | design for · judged by <IDs>

**What we are deciding.** Three to five sentences in plain, business language — no tool names: what is at
stake for the product, the tension between the options, and why it is decided at this point.

**Not decided here:** neighbouring questions, and the entries that own them.

| Criterion | A — … | B — … | C — … |
|---|---|---|---|
| <each judging requirement, plus cost today, cost of changing later, QR-21 the company's stack> | ✅ / ⚠️ / ❌ / ❓ + a few words | … | … |

- **Decision:** one sentence.
- **Evidence:** measured facts (version, date, size, spike) with their source.
- **Wrong if:** the observable condition under which this decision becomes the wrong one.
- **Where it leads:** gains, costs, and the growth path — concretely, not "has trade-offs".
```

Legend: ✅ satisfies · ⚠️ partly, or at a cost · ❌ fails — the requirement named in the row · ❓ unknown.
Options are genuinely different approaches, and the company's own stack is always one of them when it applies.

## Register

| ID | Open question | Judged by | Needed by |
|---|---|---|---|
| D-01 | Build the web app as one project, or split it up front into shareable parts? | QR-8, QR-5, DR-1, DR-8, C-2 | plan 01 |
| D-02 | How do we install the project's building blocks, and which engine runs our tools? | QR-13, QR-11, QR-21, QR-19, FR-6, C-2 | plan 01 |
| D-12 | Which version of the app do we run while developing, and which one do the tests check? | C-2, FR-6, QR-9, QR-11, QR-13, QR-17 | plan 01 |
| D-22 | How strict should the compiler be, and which version of it do we build on? | QR-1, QR-3, QR-5, QR-13, QR-21 | plan 01 |
| D-13 | React Compiler | QR-4, QR-21 | plan 01 |
| D-24 | Which tool turns the backend contract into types — and does it decide our compiler version? | FR-3, QR-5, QR-24, QR-25, QR-21, QR-3 | plan 01, before D-22 |
| D-10 | Lint, format, hooks, commit conventions | FR-2, QR-7, QR-14, QR-15 | plan 02 |
| D-21 | Security tooling and agent guardrails | QR-11, DR-6 | plan 02 |
| D-23 | How do new packages get into the project, and how do we keep them up to date? | QR-24, QR-25, QR-11 | plan 02 |
| D-16 | Actor zones and rendering strategy per zone | DR-1, DR-4, QR-8 | plan 03 |
| D-03 | How server data is fetched, cached and validated at the boundary (the generator itself moved to D-24, CC-01) | FR-3, QR-1, QR-5 | plan 04 |
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
| D-11 | CI/CD with agentic checks, and how environments stay close to production (design for) | DR-9, DR-11, QR-15 | plan 09 |
| D-15 | Extent of the AI layer (commands, agents, MCP beyond the baseline; the path to DR-10) | QR-18, QR-19, QR-8, DR-10 | plan 09 |

## Decisions

### D-01 — Build the web app as one project, or split it up front into shareable parts?

`Accepted` 2026-09-10 · needed by plan 01 · build now · judged by QR-8, QR-5, DR-1, DR-8, C-2

**What we are deciding.** The company will have more than one frontend: the web app today, a public marketing
and sign-in site, and a planned mobile app. What they could share — the rules for money and transactions,
and the connection to the backend — can be split out now, before a second product exists, or kept inside
one project and split out when that product arrives. Splitting now costs setup time for a benefit nobody
can use yet; not splitting risks the shared rules getting tangled with web-only code, which would make the
later split expensive. The question is how to take the cheap option now without paying that risk later.
It comes first because every later decision builds on the shape of the project.

**Not decided here:** layer and zone names (D-16), where generated types go (D-03), the package manager
(D-02), which layers may use React (D-03, D-16).

| Criterion | A — one Vite app | B — workspace now (`apps/web`, `packages/*`) | C — separate repos / micro-frontends |
|---|---|---|---|
| QR-8 pragmatism | ✅ structure matches reality: one consumer | ❌ every package has exactly one consumer | ❌ one team, one app |
| Boundary strength today | ⚠️ imports by lint; DOM in the domain by the compiler (spike); API layer by lint only | ✅ package manifests; lint still needed inside a package | ✅ the repository boundary |
| DR-8 domain reusable in React Native | ⚠️ DOM-free now; extraction later is mechanical | ✅ ready | ⚠️ via a published, versioned package |
| DR-1 separable public zone / SSR | ⚠️ a second Vite entry or extraction later; zone isolation by lint from day one | ✅ `apps/public` fits naturally | ✅ separate deploy |
| QR-5 backend-agnostic contract | ✅ `contract/` beside the app | ✅ `packages/contract` | ⚠️ a separately published artefact |
| C-2 Docker | ✅ one install, one image | ⚠️ workspace-aware install | ❌ several images |
| Cost today (1.5–2 h budget) | ✅ one extra tsconfig | ❌ ≈ 9 extra configs (estimated from the layout, not measured) | ❌ repositories, versioning, federation |
| FR-1, QR-17 new hire, live extension | ✅ one tree, one recipe | ⚠️ first find the right package | ❌ scattered |
| Cost of changing later | ⚠️ A → B is mechanical | ✅ none | — |
| QR-21 the company's stack | ❓ unknown | ❓ unknown; planned React Native hints at a monorepo | ❓ unknown |

- **Decision:** one Vite app; the contract beside it in `contract/`, standing in for the backend's (QR-5); `src/domain` compiles under its own DOM-free tsconfig, so DR-8 is a compiler error, not a convention.
- **Evidence:** spike, TypeScript 7.0.2, 2026-09-10 — under `lib: ["ES2023"]`, `document` fails (TS2584) and so does `fetch` (TS2304). The DOM-free rule therefore fits `src/domain` only; the API layer is kept React-free by lint.
- **Wrong if:** a second consumer appears — a separately built public zone (DR-1) or a React Native app (DR-8). Domain and API client then move to packages, mechanically, because they already import no DOM and no React.
- **Where it leads:**
  - *Gains* — one install, one config, one image, one `check`; a new hire sees one tree; an interviewer extends it without first learning a package map.
  - *Costs* — boundaries rest on lint and tsconfig, not on package manifests; every new top-level folder must be added to the rules, or it is silently unconstrained (a gate that checks the gate is a candidate for plan 03).
  - *Growth path* — the second consumer triggers extraction into packages. React Native would then reuse the domain, the contract and the API client; UI, routing and the credentials part of the transport stay per platform.

### D-02 — How do we install the project's building blocks, and which engine runs our tools?

`Accepted` 2026-09-10 · needed by plan 01 · build now · judged by QR-13, QR-11, QR-24, QR-21, QR-19, FR-6, C-2

**What we are deciding.** Every developer, every check and the Docker setup must install the project's
third-party building blocks the same way, with one tool, and run the development tools on one engine.
The company's team uses a newer, faster toolkit for this; the testing tools officially promise support only
for the established engine. Choosing the team's toolkit makes the skeleton feel native to them;
choosing the established engine avoids spending a short time budget on compatibility surprises. The
choice also sets how far the project trusts third-party code that wants to run during installation — a
supply-chain risk.

**Not decided here:** what `docker compose up` serves (D-12), the hook manager (D-10), the TypeScript
version and flags (D-22).

| Criterion | A — npm, Node 24 LTS | B — pnpm, Node 24 LTS | C — Bun installs and runs scripts, Node 24 LTS runs the tools | D — Bun for everything |
|---|---|---|---|---|
| QR-21 the company's stack | ❌ not theirs | ❌ not theirs | ✅ Bun for install and scripts · ⚠️ tools on Node | ✅ fully theirs |
| QR-13 one lockfile, frozen install | ✅ `npm ci` | ⚠️ frozen install fails until `allowBuilds` is set; settings renamed between majors | ✅ `bun install --frozen-lockfile`, text `bun.lock` | ✅ as C |
| QR-11 install scripts (supply chain) | ❌ runs every package's scripts | ✅ blocks all until allowed, and fails loudly | ✅ blocks all but a 367-package default trust list | ✅ as C |
| QR-24 quarantine, audit, provenance | ✅ `--min-release-age`, `npm audit`, `npm audit signatures` (76 packages attested in the spike) | ⚠️ `minimumReleaseAge`, `pnpm audit` (not measured) | ⚠️ `install.minimumReleaseAge`, `bun audit` (310 packages, 288 ms); signature verification ❓ | ⚠️ as C |
| FR-6 test tools on a documented runtime | ✅ | ✅ | ✅ | ⚠️ Vitest passed on `--bun`; Playwright does not list Bun |
| QR-19 CodeGraph and MCP on the host | ✅ | ✅ | ✅ | ⚠️ still needs Node on the host — "Bun everywhere" is not reachable |
| C-2 Docker image | ✅ official Node image | ⚠️ Node image plus pinned pnpm | ⚠️ Node image plus the Bun binary: builds in 9 s, 464 MB | ⚠️ 274 MB, but `node` is a symlink to Bun |
| Cost today | ✅ none | ⚠️ allowlist config | ⚠️ one Dockerfile line; Bun on the author's machine | ⚠️ as C, plus compatibility debugging |
| Cost of changing later | ✅ regenerate the lockfile | ✅ as A | ✅ as A; C → D drops Node from the image | ✅ as A |

- **Decision:** Bun 1.4.2 installs dependencies and runs scripts, with one `bun.lock`; Node 24 LTS (24.21.0) runs Vite, Vitest, Playwright and CodeGraph; the Docker image is Node with the Bun binary copied in.
- **Evidence:** spike, 2026-09-10 — CodeGraph 3.17.0 builds its index under all three managers; pnpm 11.5.3 exits 1 (`ERR_PNPM_IGNORED_BUILDS`) until `allowBuilds` is set; Bun trusts lefthook, msw and better-sqlite3 through its default list; in `oven/bun:1.4.2-slim`, `node` is a symlink to Bun. Docs: Vitest requires Node ≥ 22.12; Playwright lists Node 22, 24 and 26 only.
- **Wrong if:** Playwright adds Bun to its supported runtimes, or parity with the company's own runtime matters more than documented support — then D, by dropping Node from the image. If the two-runtime image costs more time than the budget allows — then A.
- **Where it leads:**
  - *Gains* — the skeleton speaks the company's commands; install scripts of unknown packages are blocked by default; the test tools run on the runtime they document.
  - *Costs* — two runtimes to pin and a larger image; Bun on the author's machine (C-2 is unaffected: the image carries both); `bun test` starts Bun's own test runner, not Vitest, so scripts always go through `bun run test`.
  - *Growth path* — C → D is one Dockerfile line once Playwright supports Bun; C → A is regenerating the lockfile.

### D-12 — Which version of the app do we run while developing, and which one do the tests check?

`Accepted` 2026-09-10 · needed by plan 01 · build now · judged by C-2, FR-6, QR-9, QR-11, QR-13, QR-17

**What we are deciding.** The app exists in two forms: the development form, where a code edit appears
in the browser within a second, and the production form users receive — optimised, with production
security headers, compression and caching. They behave differently, so a bug can live in one and not
the other, and a test that passes against the development form proves little about the product. Slow
production hardware widens the gap further: a test that passes on a fast laptop can fail on the cheap
CPUs production often runs on (S4). Yet development without instant feedback is slow, and the interview
extends the code live. The question is which form one command starts, which form the tests check, and
how close the local production form is to a real one. Whatever the answer, everything runs in Docker —
the machine needs nothing else (C-2).

**Not decided here:** how the production form gets data without the mock inside the build (D-04 — a mock
server behind the same origin keeps the build identical to production), browser tests in Docker (D-09),
throttling numbers (D-20), CI/CD and environment parity beyond this machine (D-11, DR-11).

| Criterion | A — dev only; tests build production on their own | B — production only | C — two modes; production served by `vite preview` | D — two modes; production served by Caddy |
|---|---|---|---|---|
| C-2 one command, reachable | ✅ | ✅ | ✅ `docker compose up` is dev | ✅ as C |
| QR-17 live extension (edit → see) | ✅ hot reload; a host edit reached the container in 18 ms | ❌ rebuild after every change | ✅ | ✅ |
| Tests check what users get | ⚠️ a production bundle, hidden inside the test tooling | ✅ | ⚠️ production bundle, but preview is "not meant as a production server" — headers, fallback and compression differ | ✅ production bundle behind a real server config |
| QR-11 CSP asserted in production mode | ⚠️ preview headers only | ✅ | ⚠️ preview headers only | ✅ in the server config, with a test |
| QR-9 budgets on the production form | ✅ | ✅ | ✅ | ✅ |
| A failing browser test, reproduced by hand | ⚠️ no production mode to open | ✅ | ✅ `--profile prod` | ✅ `--profile prod` |
| QR-13 clean-clone boot | ⚠️ `node_modules` in a named volume | ✅ | ⚠️ two paths to keep working | ⚠️ two paths; a broken build fails the production stage early |
| QR-8 pragmatism | ✅ one mode | ⚠️ server, plus mock data in the build | ✅ the second mode has a consumer: the tests | ✅ as C, plus about ten lines of server config |
| Cost today | ✅ lowest | ⚠️ server stage | ⚠️ a compose profile | ⚠️ a profile, a build stage, a Caddyfile (`caddy:2-alpine`, 21.7 MB) |
| Editing on Windows with WSL2 | ⚠️ needs polling | ✅ nothing to watch | ⚠️ dev as A | ⚠️ dev as A |
| QR-21 the company's stack | ❓ how they host the frontend is unknown | ❓ | ❓ | ❓ |

- **Decision:** two modes, both in Docker — development on the dev server, every browser test against a production build behind a real web server:
  - `docker compose up` → `web`: the Vite dev server with hot reload, source bind-mounted — the base for development;
  - `docker compose --profile prod up` → `web-prod`: a multi-stage image builds the production bundle and serves it with Caddy, a single-binary web server in nginx's role — static files, `index.html` fallback for client routes, production headers (CSP, caching, compression), and `/api` proxied to the mock if D-04 needs it;
  - `docker compose run --rm check` → the full `check` in the dev image;
  - end-to-end, accessibility and throttled performance tests run against `web-prod`, never against the dev server.

  Caddy over nginx for a shorter config (to be confirmed in plan 01); nginx is equally valid and more familiar — the difference is one config file, not the architecture.
- **Evidence:** spike, 2026-09-10 — through the OrbStack bind mount a host edit reached `fs.watch` in the container in 18 ms. Vite docs: `vite preview` is "not meant as a production server", only "an easy way to check if the production build looks OK" locally; on Docker with a WSL2 backend, file watching misses edits made by Windows apps. Docker Hub: `caddy:2-alpine` 21.7 MB, `nginx:1.29-alpine` 24.6 MB compressed.
- **Wrong if:** the real host serves the frontend in a way Caddy cannot approximate — assets from the Rails app, or a CDN with its own headers; then the production mode mirrors that host instead. Or the interview needs no live editing — then B alone.
- **Where it leads:**
  - *Gains* — tests exercise the bundle and headers users get; a failing test opens by hand in the same mode; development keeps instant feedback.
  - *Costs* — two modes to keep working; a production build before each browser-test run; a Caddyfile to own; editing inside Docker on Windows needs polling.
  - *Growth path* — the production stage becomes the deploy artefact; CI runs the same profile and tests (D-11); staging and hardware parity are DR-11.

### D-22 — How strict should the compiler be, and which version of it do we build on?

`Proposed` — on hold until D-24 (CC-01) · needed by plan 01 · build now · judged by QR-1, QR-3, QR-5, QR-13, QR-21

**What we are deciding.** The compiler is the first reviewer of every line. With financial data it should
reject whole classes of mistakes before the code runs: reading a row that may not exist, treating "no
value" as a value, forcing one type into another, and the escape hatch that switches checking off. The
stricter it is, the more precise the code must be. There is also a version choice: the newest compiler
is much faster, but it has dropped the programming interface other tools rely on — including the tool
that turns the backend contract into types. The question is how strict to be, which conventions become
mandatory, and which version lets every tool in the chain work today.

**Not decided here:** the contract generator (D-24 — this entry keeps its options open), the lint and
hook setup (D-10), the React Compiler (D-13).

| Criterion | A — TypeScript 7.0.2 (native) | B — TypeScript 6.0.3 | C — TypeScript 5.9.3 |
|---|---|---|---|
| QR-3 strict flags reject the deliberate violations | ✅ TS1294, TS2375, TS2532 | ✅ the same, 709 ms | ❓ not run |
| D-01 DOM-free domain through project references | ✅ TS2584 | ✅ TS2584 | ❓ not run |
| QR-5 contract → types, D-24 kept open | ❌ no JS API: `openapi-typescript` exits 1; `@hey-api/openapi-ts` supports ≤ 6; only template generators remain | ✅ `openapi-typescript` 7.13.0 generates correctly | ✅ every generator's peer range satisfied |
| QR-13 install without overrides | ⚠️ any tool with a `^5` peer needs one | ⚠️ `openapi-typescript` declares `^5`: npm refused without `--legacy-peer-deps`; Bun ❓ | ✅ |
| QR-21 the company's posting: "TypeScript strict/modern" | ✅ newest | ⚠️ one major behind — the last release with the JS API | ❌ two majors behind |
| Typecheck speed (404 files of careero's frontend) | ✅ ≈ 0.47 s — the same 197 diagnostics as 6.0.3 | ⚠️ ≈ 3.6 s — about 7.8× slower | ❓ not run |
| Cost of changing later | — | ⚠️ for us a version bump — our flags compile on both; the blocker is upstream: `openapi-typescript` builds types through 456 `ts.factory` calls that must be ported to 7's unstable AST API, and no port is visible | ⚠️ two bumps |

| Convention | Enforced by | Proven by (spike) |
|---|---|---|
| no `enum` or `namespace` — unions of literals and `as const` objects | `erasableSyntaxOnly` | TS1294 |
| index access yields `T \| undefined` | `noUncheckedIndexedAccess` | TS2532 |
| an optional field is absent, not `undefined` | `exactOptionalPropertyTypes` | TS2375 |
| no `any`; no non-null `!` | oxlint `no-explicit-any`, `no-non-null-assertion` | both fired |
| no `as` casts outside boundary parsers; `as const` and `satisfies` stay | oxlint `consistent-type-assertions: never`, overridden for boundary modules | fired on `as Amount`, not on `as const` |
| `type`, not `interface` (`.d.ts` augmentation excepted) | oxlint `consistent-type-definitions: type` | fired |
| type-only imports are explicit | `verbatimModuleSyntax`, oxlint `consistent-type-imports` | fired |
| types obey module boundaries — `import type` and `export type … from` are restricted like values (FR-2) | oxlint `no-restricted-imports`, never with `allowTypeImports` | all four forms flagged; with `allowTypeImports: true` the three type forms slip through |
| every union handled exhaustively | `assertNever(value: never)` in each `default` branch — the compiler, no type-aware lint | proven when the first union lands (QR-23) |

- **Decision:** TypeScript 6.0.3 with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly` and `verbatimModuleSyntax`, and the conventions above enforced by the compiler and oxlint — `type` over `interface` because the domain is unions and brands, and interfaces merge silently when declared twice.
- **Evidence:** spikes, 2026-09-10 — 7.0.2 and 6.0.3 reject the same deliberate violations; 7.0.2 has no `main` entry and no `ts.factory`; `openapi-typescript` 7.13.0 generates with 6.0.3 and exits 1 with 7.0.2; oxlint 1.82.0 fired every listed rule, allowed `as const`, and refused an unknown rule name instead of ignoring it. Benchmark on careero's 404 frontend files, three runs each: 6.0.3 ≈ 3.6 s, 7.0.2 ≈ 0.47 s, identical diagnostics. Why the generator fails on 7: it imports `typescript` in 31 files and calls `ts.factory.*` 456 times; in 7 `ts.factory` is undefined (`TypeError … 'createKeywordTypeNode'`), and the replacement ships only as `typescript/unstable/ast/*`. A search of the generator's repository found no issue or pull request about 7.
- **Wrong if:** D-24 picks a generator that needs no JS API, or `openapi-typescript` supports 7 — then 7 now. If the peer override proves brittle under Bun in plan 01 — then 5.9.3.
- **Where it leads:**
  - *Gains* — money-shaped mistakes fail compilation; conventions are errors, not review comments; every tool in the chain works today; D-24 keeps all its options.
  - *Costs* — stricter code: every index access and optional field handled precisely; a peer override to own; a slower typecheck than the native compiler; one major behind, which the interview may ask about — the measured answer is the missing JS API.
  - *Growth path* — three exits from 6, in order of cost: (1) a hybrid — the `typescript@6` package stays for tools while the native 7 binary runs the typecheck in `check`, safe because both report identical diagnostics; worth it once the typecheck takes minutes; (2) 6 → 7 outright once the generator ports to the new API; (3) 7 now with a generator that needs no compiler API — the D-24 question, since those generators also bring runtime schemas. Type-aware lint (oxlint-tsgolint already embeds the native compiler) can replace `assertNever` if it proves insufficient.

### D-24 — Which tool turns the backend contract into types — and does it decide our compiler version?

`Accepted` 2026-09-10 · needed by plan 01, before D-22 · build now · judged by FR-3, QR-5, QR-24, QR-25, QR-21, QR-3

**What we are deciding.** Every piece of data the screens show comes from the backend, and its shape is
described once, in the contract. A generator reads that description and writes the code the frontend
compiles against, so a change on the backend breaks the build instead of a customer's screen. The
generator we assumed turned out to be unmaintained (CC-01) and to block the newest compiler, so the
choice now carries three risks at once: the correctness of every screen, the security of what we
install, and which compiler we can use. The question is which generator to trust with that — and how
much of the API layer we let it write for us.

**Not decided here:** how data is cached and validated at the boundary (D-03), where mocks live and how
they stay out of production (D-04), the compiler version (D-22 — this entry unblocks it).

| Criterion | A — `openapi-typescript` (types only) | B — `orval` (types, query hooks, mock handlers) | C — `@hey-api/openapi-ts` | D — hand-written types |
|---|---|---|---|---|
| FR-3 server types from the contract | ✅ | ✅ | ✅ | ❌ hand-written payload types |
| FR-3 mocks typed from the same contract | ⚠️ via `openapi-msw`, not released since 2025-08 | ✅ MSW handlers and mock data generated | ❓ | ❌ |
| QR-1 unions and enums in our conventions | ❓ union not tried | ✅ `Deposit \| Trade` discriminated; enums as `as const` objects | ❓ | ⚠️ by discipline |
| QR-3 generated code passes our strict flags | ❓ not run under them | ✅ with `mock.required: true`; the default leaves `undefined` in two mock fields (TS2375) | ❓ | ✅ |
| Our transport stays the one exit to the network | ✅ types only | ✅ generated calls go through our function (mutator) | ❓ | ✅ |
| D-22 compiler version left free | ❌ crashes on 7 | ✅ generated and typechecked on 7.0.2 | ❓ spike declined | ✅ |
| QR-24, QR-25 maintained and safe to install | ❌ stalled (CC-01); audit clean | ✅ five human merges on 9–10 Sep, one a security fix · ⚠️ one high advisory via `js-yaml` 4.3.1 → override to ≥ 4.3.2 | ⚠️ active, pre-1.0 | ✅ nothing to install |
| QR-8 how much it writes and pulls in | ✅ types only | ⚠️ hooks and mock data too; its tree carries `typedoc` with a nested TypeScript 6 | ❓ | ✅ nothing |
| Cost of changing later | ✅ types only, easy to swap | ⚠️ generated hooks spread through screens; switching to types-only output is one config key | ❓ | ❌ every type by hand |

- **Decision:** `orval` 8.30.0 generates the types, the TanStack Query hooks through our own transport, and the MSW handlers with mock data — all from one contract, with `mock.required: true` and a `js-yaml` override to ≥ 4.3.2 until `orval` ships one.
- **Evidence:** spike, 2026-09-10, on a contract with a `Deposit | Trade` union and a query-parameter enum — generation on TypeScript 7.0.2 exit 0; hooks import our transport; `api.msw.ts` and `api.faker.ts` generated; typecheck under all our strict flags exit 0 after `mock.required: true`; `npm audit` — `js-yaml` 4.3.1 affected (< 4.3.2), npm's own "fix" is a downgrade to orval 7. Registry: MIT, Node ≥ 22.18; `openapi-msw` last release 2025-08.
- **Wrong if:** the generated hooks fight the cache and query-key conventions D-03 and D-06 settle on — then `orval` emits types and mocks only, and hooks stay hand-written; or its advisories keep recurring faster than it fixes them; or `openapi-typescript` revives with TypeScript 7 support and types-only minimalism wins back.
- **Where it leads:**
  - *Gains* — one contract drives types, calls and mocks, so a backend change breaks the build in all three places at once; D-22 can take the native compiler; the generator is actively maintained.
  - *Costs* — more generated code, and a heavier install to audit; an override to own until upstream bumps `js-yaml`; generated hooks shape the API layer, so D-03 has to accept or narrow them.
  - *Growth path* — a second backend (DR-5) is a second `orval` target with its own contract; the Zod output `orval` also offers is the candidate for runtime validation at the boundary (D-03).

## Course corrections

When evidence overturns an assumption — even one never written down — the earlier reasoning stays and
the correction is recorded here, dated, with what triggered it. This is the chain of thought
`ARCHITECTURE.md` retells.

### CC-01 — The contract generator we assumed is no longer maintained · 2026-09-10

- **Assumed:** `openapi-typescript` turns the contract into types, as in the author's earlier template. D-22 therefore chose TypeScript 6.0.3, because the generator crashes on 7.
- **Found:** measured while explaining that crash — 6.3 M weekly downloads, yet no release since 2026-02-11, no human commit among the last 100 on `main`, not one maintainer reply on the TypeScript 6 issue (#2723, open since March) or the TypeScript 7 issue (#2841), and its core dependency a major behind (`@redocly/openapi-core` ^1.34 against 2.51).
- **Changed:** the generator moves out of D-03 into D-24, decided before D-22 because the compiler version depends on it; D-22 stays `Proposed`, on hold; QR-24 now checks a package's maintenance health, not only its identity.
- **Lesson:** popularity is not maintenance. A dependency's health is an input to a decision, measured like any other.

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
| 09 | `ARCHITECTURE.md` assembled from Part II conclusions (Decision, Where it leads) and the course corrections, README, AI-layer paragraph, final review |
