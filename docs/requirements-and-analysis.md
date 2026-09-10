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
| DR-8 | **Mobile (React Native planned, S2)** — domain types and the contract client usable outside the web | the domain imports no DOM and no React; the API layer imports no DOM and no web-only renderer (`react-dom`). React Native runs React and TanStack Query, so the API layer's hooks are allowed. Lint-enforced (amended 2026-09-11, CC-04) |
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
| D-13 | Do we let a compiler optimise rendering for us, and which one do we trust? | QR-4, QR-2, QR-9, QR-21, QR-24 | plan 01 |
| D-24 | Which tool turns the backend contract into types — and does it decide our compiler version? | FR-3, QR-5, QR-24, QR-25, QR-21, QR-3 | plan 01, before D-22 |
| D-10 | How do we catch mistakes and keep the code in one shape before anyone reviews it? | FR-2, QR-3, QR-4, QR-7, QR-12, QR-14, QR-21, QR-23, QR-24 | plan 02 |
| D-25 | When do the checks run, and how do commit messages keep to the convention? (split from D-10) | QR-15, FR-2, QR-23, QR-24 | plan 02 |
| D-21 | What keeps secrets and unsafe code out, and what may the agent touch? | QR-11, DR-6, QR-7, QR-23, QR-24 | plan 02 |
| D-23 | How do new packages get into the project, and how do we keep them up to date? | QR-24, QR-25, QR-11 | plan 02 |
| D-26 | When the agent starts a container, how much of the machine can that container reach? | DR-6, QR-11, QR-7, QR-8, C-2, FR-6 | deferred by the author — not what the take-home is about |
| D-16 | How do we divide the code so everyone knows where things go, and the parts of the product stay apart? | FR-1, FR-2, DR-1, DR-4, DR-8, QR-8, QR-17, QR-21, QR-23 | plan 03 |
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
- **Evidence:** spike, TypeScript 7.0.2, 2026-09-10 — under `lib: ["ES2023"]`, `document` fails (TS2584) and so does `fetch` (TS2304). The DOM-free rule therefore fits `src/domain` only; the API layer is kept React-free by lint. *Amended 2026-09-11 (CC-04):* the API layer is kept free of the DOM, not of React, because it holds D-24's generated hooks.
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

**Amendment — 2026-09-10: the host's runtimes are pinned in the repository too.** The entry pinned Bun
and Node for Docker; the host was left to whatever each developer had installed. Now `mise.toml` in the
repository pins Node 24.21.0 and Bun 1.4.2, and mise (installed with Homebrew, 2026.9.4) puts exactly
those on the path inside the project — so QR-13's "runtime pinned in a file" holds on every machine, not
only in the image. Rejected: nvm for Node plus a global `npm install -g bun@1.4.2` — no new tool, but two
mechanisms and nothing that enforces the Bun version; Bun's install script — a remote script, the risk
QR-24 guards against. Admission check (QR-24): MIT, 33.7 k stars, four releases in September, a human
commit on the day. Cost: one more tool, a shell hook, and — for the agent's non-interactive shell —
shims or `mise exec`, settled in plan 01.

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

`Accepted` 2026-09-10, revised after D-24 · needed by plan 01 · build now · judged by QR-1, QR-3, QR-5, QR-13, QR-21

**What we are deciding.** The compiler is the first reviewer of every line. With financial data it should
reject whole classes of mistakes before the code runs: reading a row that may not exist, treating "no
value" as a value, forcing one type into another, and the escape hatch that switches checking off. The
stricter it is, the more precise the code must be. There is also a version choice: the newest compiler
is much faster, but it has dropped the programming interface some tools rely on. The question is how
strict to be, which conventions become mandatory, and which version every tool in our chain can live
with.

**Not decided here:** the lint and hook setup (D-10), the React Compiler (D-13). The contract generator
was decided first, because this entry depended on it (D-24, CC-01).

| Criterion | A — TypeScript 7.0.2 (native) | B — TypeScript 6.0.3 | C — TypeScript 5.9.3 |
|---|---|---|---|
| QR-3 strict flags reject the deliberate violations | ✅ TS1294, TS2375, TS2532 | ✅ the same | ❓ not run |
| D-01 DOM-free domain through project references | ✅ TS2584 | ✅ TS2584 | ❓ not run |
| D-24 contract generator (`orval`) | ✅ generated and typechecked on 7.0.2 | ✅ | ✅ |
| The rest of the chain: Vite, React plugin, TanStack Router plugin, Vitest | ✅ build, typecheck and tests green; none imports the old JS API; router types reject a missing route (TS2820) and a mistyped search param (TS2322) | ✅ | ❓ not run |
| QR-13 install without overrides | ✅ no peer conflict in the chain | ✅ | ✅ |
| QR-21 the company's posting: "TypeScript strict/modern" | ✅ newest | ⚠️ one major behind | ❌ two majors behind |
| Typecheck speed (404 files of careero's frontend) | ✅ ≈ 0.47 s | ⚠️ ≈ 3.6 s — about 7.8× slower | ❓ not run |
| Tools that embed the old JS API | ❌ closed until they port — `openapi-typescript` measured; Stryker's TypeScript checker and TypeScript-based docgen are likely (not measured) | ✅ | ✅ |
| Cost of changing later | ✅ no migration left to carry | ⚠️ the move to 7 still ahead | ⚠️ two moves ahead |

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

- **Decision:** TypeScript 7.0.2 with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly` and `verbatimModuleSyntax`, and the conventions above enforced by the compiler and oxlint — `type` over `interface` because the domain is unions and brands, and interfaces merge silently when declared twice.
- **Evidence:** spikes, 2026-09-10, on 7.0.2 — the deliberate violations rejected; a Vite 8 + React plugin + TanStack Router + Vitest 5 app builds, typechecks and tests green under every strict flag, with no tool importing the old JS API; `orval` output typechecks (D-24). 7.0.2 ships no JS API (`ts.factory` undefined). Benchmark on careero's 404 frontend files, three runs each: 7.0.2 ≈ 0.47 s, 6.0.3 ≈ 3.6 s, identical diagnostics. oxlint 1.82.0 fired every listed rule, allowed `as const`, and refused an unknown rule name instead of ignoring it.
- **Wrong if:** a tool the project needs cannot run without the old JS API — then that one tool gets `typescript@6` under an alias while the project stays on 7; if several do, B.
- **Where it leads:**
  - *Gains* — money-shaped mistakes fail compilation; conventions are errors, not review comments; the native compiler's speed from day one; no migration left to carry.
  - *Costs* — tools built on the old JS API are closed until they port, so every new dev tool is checked against 7 before it is admitted (QR-24); stricter code everywhere: each index access and optional field handled precisely.
  - *Growth path* — the alias escape hatch above, per tool; type-aware lint (oxlint-tsgolint already embeds the native compiler) can replace `assertNever` if it proves insufficient.

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

### D-13 — Do we let a compiler optimise rendering for us, and which one do we trust?

`Accepted` 2026-09-10 · needed by plan 01 · build now · judged by QR-4, QR-2, QR-9, QR-21, QR-24

**What we are deciding.** Tables with thousands of rows re-render constantly as people filter and scroll.
Keeping them fast by hand means wrapping values and handlers in memoisation everywhere — noise that is
easy to get wrong. The React Compiler does it automatically at build time. Two implementations exist:
the official one, stable, and a faster native port, still experimental. They behave differently on our
code: one refuses components that use the big-integer amounts our money model is built on, and neither
notices a component that changes its own inputs. The question is whether to use a compiler, which one,
and what must fail loudly instead of silently.

**Not decided here:** lint and hooks (D-10), performance budgets (D-20), where generated data becomes
read-only (D-03).

| Criterion | A — no compiler; memoise by hand where a profile says so | B — native port (`oxc-transform-react` 0.145, `react({ compiler: true })`) | C — official compiler (`babel-plugin-react-compiler` 1.0 via `@rolldown/plugin-babel`), `panicThreshold: "all_errors"` | D — official compiler, opt-in per component (`"use memo"`) |
|---|---|---|---|---|
| QR-4 memoisation without hand-written noise | ❌ by hand | ✅ `Total` memoised | ✅ `Total` memoised (`c(4)`) once literals leave components | ⚠️ only where annotated |
| QR-21 the company's stack names React Compiler | ❌ | ⚠️ the plugin docs: "Native React Compiler support is experimental" | ✅ the official compiler | ✅ |
| QR-2 components that use BigInt amounts | ✅ | ✅ compiled | ⚠️ a `0n` inside a component is refused; with `all_errors` the build fails, so the literal moves to the domain, where money logic belongs anyway | ⚠️ as C |
| A component the compiler cannot handle | — | ❌ no diagnostic, even with `logDiagnostics` | ✅ the build fails and names it | ⚠️ skipped silently by default |
| A component that mutates its props | ❌ unnoticed | ❌ compiled without a word | ❌ compiled without a word | ❌ |
| QR-24 what it adds to install and audit | ✅ nothing | ⚠️ one pre-1.0 native package | ⚠️ `@babel/core`, `@rolldown/plugin-babel`, the plugin | ⚠️ as C |
| Build (this app, unminified, single noisy runs) | 1.14 s | 0.84 s, +1.14 kB runtime | 0.73 s, the same runtime | as C |
| Cost of changing later | ✅ | ✅ one plugin option | ✅ C → B is one plugin option once the port is stable | ✅ |

- **Decision:** the official React Compiler through `@rolldown/plugin-babel` with `panicThreshold: "all_errors"`, so a component it cannot optimise fails the build instead of shipping silently unoptimised; BigInt literals live in the domain, never inside components; props are typed `readonly`, because neither compiler nor lint catches a component mutating its inputs — the type checker does.
- **Evidence:** spikes, 2026-09-10, Vite 8 on TypeScript 7 — the official compiler logged `CompileError … Handle BigIntLiteral expressions` and left `Total` unoptimised; with the literal moved to a module constant it compiled all four components; with `all_errors`, a literal inside a component failed the build (exit 1). The native port compiled every component, BigInt included, and gave no diagnostic for `Mutates`; the official one compiled `Mutates` too. oxlint's `purity`, `refs`, `set-state-in-render` and `immutability` rules passed it. `readonly` parameters turned both mutations into compile errors (TS2339, TS2540). `orval`'s models are not read-only (`items: Transaction[]`).
- **Wrong if:** the native port leaves experimental and passes the same checks — then B, one option; or `all_errors` blocks legitimate code more often than it catches real problems — then `critical_errors` plus a logged report reviewed at wrap-up.
- **Where it leads:**
  - *Gains* — memoisation without noise on the table-heavy screens; the compiler's limits become build errors, not silent slowness; money literals stay in the domain, where QR-2 wants them.
  - *Costs* — Babel back in the build and three packages to audit; a coding rule (no BigInt literals in components) enforced by the build rather than by lint; read-only props to declare, while generated models are mutable — D-03 decides where they become read-only.
  - *Growth path* — the native port once it is stable; D-20's performance tests measure whether the compiler earns its place on real screens.

### D-10 — How do we catch mistakes and keep the code in one shape before anyone reviews it?

`Accepted` 2026-09-10 · needed by plan 02 · build now · judged by FR-2, QR-3, QR-4, QR-7, QR-12, QR-14, QR-21, QR-23, QR-24

**What we are deciding.** Most of what the requirements promise is real only if a machine refuses the
violation before a person reads the code:
- no loose types around money;
- React written the way its optimising compiler expects;
- accessible screens;
- parts of the app that cannot reach into each other.

That machine is a linter. A formatter comes with it, so that reviews discuss meaning, not whitespace. The
candidates differ in how many of our rules they can express and whether they work with the compiler
version already chosen. The tension: the richest rule catalogue belongs to the oldest tool, and it does
not support our compiler. The newer tools are the company's own and fast, but some rules have to be written by
hand. This is decided now because every later plan adds rules to whatever is chosen here.

**Not decided here:**
- when the checks run, and commit messages (D-25);
- which boundaries exist (D-16, plan 03) — here, only whether the tool can express them;
- secret scanning (D-21);
- type-aware lint rules — added when a rule has a consumer.

| Criterion | A — oxlint + Biome as formatter only (the company's pair) | B — oxlint + oxfmt (one toolchain) | C — Biome for lint and format | D — ESLint + `typescript-eslint` + plugins + Prettier |
|---|---|---|---|---|
| FR-2 a boundary rule sees type imports and type re-exports | ✅ `no-restricted-imports` caught an import, a type import and a type re-export; "own module vs another module" needs a local JS plugin, which caught all three with no install | ✅ as A | ✅ `noRestrictedImports` with `**` patterns caught all three; "own module vs another module" would need a GritQL plugin ❓ not run | ⚠️ `eslint-plugin-boundaries` 7.2.0 is the mature answer, but see D-22 |
| QR-3 `any`, `!`, `type` over `interface` | ✅ all three fired | ✅ as A | ✅ all three fired | ✅ |
| QR-4 Rules of React, the compiler's rules | ✅ `rules-of-hooks`, `exhaustive-deps`, `purity`, `refs`, `set-state-in-render`, `set-state-in-effect` fired · ❌ prop mutation missed (D-13: `readonly` catches it) | ✅ as A | ⚠️ `useHookAtTopLevel` and `useExhaustiveDependencies` fired; nothing for purity, refs or setting state during render — `useReactCompiler` (nursery) found nothing on the same file · ❌ prop mutation missed | ✅ `eslint-plugin-react-hooks` 7.1.1 ships the compiler's own rules |
| QR-12 accessibility rules as errors | ✅ `alt-text`, `anchor-is-valid`, `click-events-have-key-events`, `no-static-element-interactions` fired, when listed by name | ✅ as A | ✅ `useAltText`, `useValidAnchor`, `useKeyWithClickEvents`, `noStaticElementInteractions` fired | ✅ `eslint-plugin-jsx-a11y` 6.10.2 |
| QR-14 formatting gate | ✅ Biome 2.5.12 (published since 2023): `biome ci` failed on an unformatted file (exit 1) and passed once it was formatted; it would reformat 5 of our 7 files, mostly adding semicolons | ⚠️ oxfmt 0.67.0: pre-1.0, first published 2025-09-10; not run | ✅ as A | ✅ Prettier 3.9.6; not run |
| Formatter and linter agree | ✅ oxlint clean on Biome's output; `biome ci` clean after `oxlint --fix` | ❓ not run | ✅ one tool | ❓ not run |
| D-22 works on TypeScript 7.0.2 | ✅ needs no compiler API | ✅ | ✅ | ❌ `typescript-eslint` 8.70.0 requires `typescript <6.1.0` — a second compiler just for lint |
| QR-23 a rule that silently checks nothing | ⚠️ two traps measured: `../*` misses nested paths (`../**` or a regex works); a category does not switch on the accessibility rules | ⚠️ as A | ✅ every rule configured by name fired; the `../*` trap not probed | ✅ long-settled semantics |
| QR-24 what it adds to install and audit | ⚠️ Biome: a 0.8 MB wrapper plus one platform binary, no install script, SLSA provenance; oxlint is already installed | ⚠️ oxfmt, 8.9 MB | ✅ one package | ❌ ESLint, a parser, three or four plugins, Prettier |
| QR-21 the company's stack | ✅ exactly theirs | ⚠️ their linter, not their formatter | ⚠️ their formatter, not their linter | ❌ neither |
| Cost of changing later | ✅ the formatter swaps in one reformat commit; oxlint uses ESLint rule names, so D stays reachable | ✅ as A | ⚠️ its rule names and semantics differ from the ESLint family | ⚠️ several packages to move off together |

- **Decision:** oxlint for lint and Biome for formatting only — the company's own pair, pinned exactly.
  - Every rule is enabled by name, never through a category, and is proven by a deliberate violation
    before it is kept.
  - The plan 03 boundary rules use the built-in `no-restricted-imports` where a path pattern is enough.
    Where a rule must know which module a file belongs to, they use a small local JS plugin.
- **Evidence:** measured 2026-09-10.
  - *Registry:* oxlint 1.82.0 (installed; the template's range is `^1.81.0`), `@biomejs/biome` 2.5.13,
    oxfmt 0.67.0, Prettier 3.9.6, ESLint 10.10.0, `eslint-plugin-react-hooks` 7.1.1,
    `eslint-plugin-boundaries` 7.2.0, `oxlint-tsgolint` 7.0.2001. `typescript-eslint` 8.70.0 declares the
    peer `typescript >=4.8.4 <6.1.0`.
  - *oxlint 1.82.0, in a scratch project:*
    - the rules above fired on deliberate violations;
    - `no-restricted-imports` with `../*` stayed silent, while `../**` and a regex caught all three
      violations;
    - with the accessibility plugin on and whole categories set to error, not one of its rules fired,
      while listing four of them by name fired all four;
    - a local JS plugin with no dependencies caught the same three cross-page imports and left the
      page's own import alone. oxlint's schema says: "JS plugins are in alpha and not subject to semver".
  - *Biome, registry:* 5 maintainers, no install script, SLSA provenance, a release every week, human
    commits on the day, 25.7 k stars.
  - *Biome, spike:* version 2.5.12 — 2.5.13 was published the same day, younger than any quarantine D-23
    may set. It was installed, with the author's approval, into a scratch copy of the repository, never
    into the repository. Its formatting gate and its lint rules ran on the same code and the same
    violations as oxlint; the results are in the table.
- **Wrong if:**
  - a boundary plan 03 needs cannot be expressed as a JS plugin, or JS plugins break between oxlint
    releases — then `eslint-plugin-boundaries` loaded through the same JS plugin host, or ESLint for
    boundaries alone once `typescript-eslint` supports TypeScript 7;
  - Biome's output and oxlint's autofixes keep undoing each other — not seen yet.
- **Where it leads:**
  - *Gains* — the company's exact pair. One linter covers types, hooks, the compiler's rules and
    accessibility, and a boundary rule that sees type-only imports.
  - *Costs* — two config files; rules listed one by one; a small hand-written plugin on an alpha API,
    guarded by its own proof; prop mutation stays the type checker's job (D-13).
  - *Growth path* — type-aware rules through `oxlint-tsgolint`, which is built on the TypeScript 7
    compiler, when a rule earns its place — for example, exhaustive `switch` over transaction kinds
    (QR-1). oxfmt, if it reaches 1.0 and the company moves to it. If the local plugin outgrows itself,
    `eslint-plugin-boundaries` runs in the same JS plugin host.

### D-25 — When do the checks run, and how do commit messages keep to the convention?

`Accepted` 2026-09-10 · needed by plan 02 · build now · judged by QR-15, FR-2, QR-23, QR-24

**What we are deciding.** A check helps only if it runs at the right moment.
- *Too rarely*, and a broken change sits in the history. In plan 01, a dependency that broke the app's
  Docker start was caught only by a manual check from a fresh clone.
- *Too slowly or too often*, and people learn to skip checks.

Commit messages face the same question: reviewers read the history, so a machine should check its format.
The tension: ready-made tools bring dozens of third-party packages into a project that treats every
package as a risk, while git's own mechanism needs a few lines we write and prove ourselves.

**Not decided here:**
- which checks exist (D-10), and the secret scan that joins them (D-21);
- where tests run (D-09);
- CI, the only place a skipped hook is caught (D-11).

| Criterion | A — lefthook + commitlint | B — husky + commitlint | C — git's own hooks folder + commitlint | D — git's own hooks folder + a tested header pattern, no packages |
|---|---|---|---|---|
| QR-15 commit messages checked | ✅ `config-conventional`: type list, header, lengths, blank lines | ✅ as A | ✅ as A | ⚠️ the header only (type, scope, `!`, lower-case subject, ≤ 100 characters): all 34 of our commits passed, and 7 deliberately bad headers were rejected; body and footer rules unchecked |
| The Docker gate only when dependencies change (the plan 01 lesson) | ✅ a declarative `glob` | ⚠️ one shell line over `git diff --cached` | ⚠️ as B | ⚠️ as B |
| How the hooks get switched on | ⚠️ the root `prepare` runs `lefthook install`; the package's own `postinstall` is a third-party install script — ❓ whether Bun's built-in trust list lets it run | ✅ `prepare: husky` | ✅ `prepare: git config core.hooksPath .githooks` | ✅ as C |
| QR-24 what enters the install | ❌ lefthook: 28 kB plus a 12.9 MB platform binary and a `postinstall` · commitlint: 57 packages, 10 MB, no provenance | ⚠️ husky: 4 kB, no scripts, provenance · commitlint as A | ⚠️ commitlint as A | ✅ nothing |
| QR-24 maintenance health | ✅ lefthook: commits 2026-09-07, 8.8 k stars · ⚠️ commitlint: last release 2026-08-13, recent commits only from the update bot | ⚠️ husky: last release 2024-11-18, only docs commits in 2026 | ⚠️ commitlint as A | ✅ git itself |
| QR-21 the company's stack | ❓ the company has no public repositories | ❓ | ❓ | ❓ |
| Cost of changing later | ✅ | ✅ | ✅ | ✅ the hooks call package scripts, not tools, so moving to A is one commit |

- **Decision:** git's own hooks folder (`.githooks/`, switched on by the root `prepare` script) with three
  small scripts and no package:
  - *pre-commit* runs the full `check`. When `package.json` or `bun.lock` is staged, it also builds the
    image and runs `check` in Docker.
  - *commit-msg* checks the Conventional Commits header against a pattern that is proven on bad headers.
  - *pre-push* runs `check` in Docker — the reviewer's environment — as the backstop.
- **Evidence:** measured 2026-09-10.
  - *Registry and repositories:* lefthook 2.1.12, husky 9.1.7, `@commitlint/cli` 21.2.2, figures as in the
    table. commitlint's tree was counted from the registry at latest versions.
  - *Bun 1.4.2:* in a scratch project it runs the root `prepare` and `postinstall` on plain and frozen
    installs, and skips both under `--ignore-scripts`. So the image, which has no `.git`, never tries to
    switch on hooks.
  - *Timing:* the host `check` took 0.42–0.88 s over three runs.
  - *Header pattern:* checked against the whole history of `main` and against the deliberate bad and good
    headers listed above.
- **Wrong if:**
  - `check` grows past about 10 s with tests (D-09) — then pre-commit runs format and lint only, and the
    full `check` moves to pre-push;
  - message rules grow beyond the header (a required body, issue references, changelogs from commits) —
    then commitlint, whose 57 packages would then buy something;
  - the hooks outgrow a few lines each, or need parallel runs — then lefthook;
  - the company has a house standard — then theirs.
- **Where it leads:**
  - *Gains* — no package for the whole mechanism. Every commit, the agent's included, passes the full
    gate by machine rather than by discipline. A dependency change cannot land without the Docker gate,
    so plan 01's incident cannot repeat unnoticed.
  - *Costs* — about twenty lines of shell that we own and prove. The body of a message (why, how
    verified, IDs) is checked by review, not by a tool, and `ARCHITECTURE.md` names it as such (QR-7). A
    person can still skip the hooks with `--no-verify`; the agent is denied it, and only CI closes it for
    people (DR-9).
  - *Growth path* — CI runs the same `check` and the same pattern (DR-9); lefthook or commitlint when one
    of the "wrong if" conditions happens.

### D-21 — What keeps secrets and unsafe code out, and what may the agent touch?

`Accepted` 2026-09-10 · needed by plan 02 · build now · judged by QR-11, DR-6, QR-7, QR-23, QR-24

**What we are deciding.** A financial product fails its users the moment a credential leaks. A leak can
come from the repository, from the code shipped to browsers, or from the machine the code is written
on. An AI agent working in the repository is one more way in. Most of these leaks have a machine answer:
- a scanner that refuses a commit carrying a key;
- a browser policy that runs scripts only from our own server;
- lint rules that refuse the two coding patterns that expose tokens or run untrusted HTML;
- an operating-system sandbox around the agent's commands.

The one real choice is the scanner. One option is the long-standing tool whose author has frozen it; the
other is its successor from the same author, younger but still getting new detectors. The rest of this
entry states honestly where each control stops.

**Not decided here:**
- package admission, quarantine and audit (D-23);
- where the session lives (D-17) — only the lint that forbids storing tokens is decided here;
- scrubbing telemetry (D-19);
- server-side gates in CI (D-11).

| Criterion | A — gitleaks 8.30.1 | B — betterleaks 1.8.1 | C — trufflehog 3.97.4 | D — secretlint 13.0.5 |
|---|---|---|---|---|
| QR-11 catches a key in history, working tree and staged changes | ✅ all three modes | ✅ all three modes | ❓ not run | ❓ not run |
| Keys in real formats (Stripe live, Slack bot, a Binance-style secret) | ✅ 3 of 3 | ✅ 3 of 3 | ❓ | ❓ |
| An AWS key ID alone, without its secret | ✅ flagged | ⚠️ not flagged | ❓ | ❓ |
| Our own mock data: exchange connections with key fields, transaction hashes, wallet addresses | ⚠️ flags the 4 key fields; ignores hashes and addresses | ⚠️ the same | ❓ | ❓ |
| QR-24 maintenance | ⚠️ its README: "feature complete … security patches only"; last release 2026-03-21, so no new detectors | ✅ the same maintainers, the original author first (252 commits); release 2026-08-18, commits on the day · ⚠️ the project is 7 months old | ✅ release 2026-09-03 | ⚠️ commits only from the update bot |
| QR-24 how it arrives | ✅ mise (aqua) with checksums; an official image | ✅ mise (aqua); checksums signed with sigstore; an official image for amd64 and arm64, binary at `/usr/bin/betterleaks` | ⚠️ AGPL-3.0; built to check findings against providers' live APIs (`--results=verified`) | ❌ npm with 8 direct dependencies — the kind of package this project treats as the risk |
| QR-23 a gate that fails silently | ✅ none seen | ⚠️ exit code 1 means both "found" and "tool error" (issue #347, open); a gate fails closed either way | ❓ | ❓ |
| Cost of changing later | ✅ the same CLI shape as B (`git`, `dir`, `--staged`) | ✅ one line in `mise.toml` and one in the image | ⚠️ | ⚠️ |

- **Decision:** a baseline of four controls, each proven by a deliberate violation.
  - *Secrets* — betterleaks 1.8.1, pinned in `mise.toml` for the host and copied by digest from its
    official image into ours. It runs in the pre-commit hook (`git --pre-commit --staged`) and in `check`.
    A finding blocks the commit, and triage never widens the allowlist to make it pass.
  - *The browser* — a Content-Security-Policy on the production form: `default-src 'self'; script-src
    'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri
    'none'; frame-ancestors 'none'; form-action 'self'`.
    - A header test in the Docker gate asserts it, together with plan 01's cache and fallback rules.
    - A browser-level check (no CSP violations while the app runs) joins the first end-to-end test
      (D-09).
  - *Code* — `react/no-danger` and a ban on `localStorage` and `sessionStorage`
    (`no-restricted-globals` plus `no-restricted-properties`) are lint errors (D-10).
  - *The agent* — Claude Code's OS sandbox for shell commands.
    - Reads of `~/.ssh`, `~/.aws` and `.env*` are denied, and the network is limited to the package
      registry and GitHub.
    - Docker stays outside the sandbox because it needs its socket, so the narrowed permission rules
      remain its only guard.
      - *Corrected 2026-09-10 in plan 02 (CC-03):* those rules pre-approve the agent's docker commands,
        so they guarded nothing. The sandbox now refuses writes to the files that configure docker; the
        container itself is D-26.
    - The Playwright MCP server stays outside too, and its unsafe tools remain denied.
- **Evidence:** measured 2026-09-10 on scratch repositories, with random fake keys.
  - *Scanner modes* — a clean commit gave exit 0 and a history with a leak gave exit 1 (betterleaks: 2
    findings, gitleaks: 3). With the key pair staged, both gave exit 1. betterleaks scanned our whole
    history clean in 347 ms.
  - *A misreading corrected before this was written* — betterleaks' staged mode first looked blind. It
    was the AWS key ID alone, which betterleaks does not flag in any mode.
  - *The built `index.html`* — one module script and one stylesheet, both from `/assets`, and nothing
    inline, so `'self'` holds for both scripts and styles.
  - *Lint* — oxlint's `react/no-danger` fired. The storage ban caught every access the spike made.
    - *Corrected 2026-09-10 in plan 02:* this entry first said the destructuring
      `const { localStorage } = window` slips through. It does not — the spike flagged it, and the
      reading miscounted.
    - The real gaps, measured then: an alias (`const w = window; w.localStorage`), a computed key
      (`window['local' + 'Storage']`) and `document.defaultView?.localStorage` pass. `self.localStorage`
      also passed, and plan 02 closed it.
  - *Sandbox* — the Claude Code settings schema has `sandbox.enabled`, `filesystem.denyRead`,
    `network.allowedDomains`, `credentials.files` and `excludedCommands`. How it behaves is not yet
    measured; plan 02 proves it by reading a planted file in a denied path.
  - *GitHub* — the repository is private; whether push protection is on is not visible to us ❓.
- **Wrong if:**
  - betterleaks misses a kind of leak that gitleaks catches and that matters here (so far only the lone
    key ID) — then gitleaks, one line;
  - the sandbox costs the daily loop (installs, Docker, the index) more than it protects — then keep the
    narrowed rules and name the gap in `ARCHITECTURE.md`;
  - the CSP blocks something the app needs (fonts, Sentry) — then a named source joins the policy,
    together with its test.
- **Where it leads:**
  - *Gains* — a credential cannot reach a commit, the agent's included. The bundle runs no script from
    anywhere but our server. The two code patterns that leak tokens or run untrusted HTML fail lint. The
    agent's shell cannot read the author's keys even if an injected prompt asks it to.
  - *Costs* — one Go binary pinned twice (mise and the image); a header test to keep in step with the
    policy; known bypasses of the storage ban (an alias, a computed key, `document.defaultView`), so review still owns them (QR-7) — the real guard is that no token ever reaches the browser (DR-2); Docker and
    the MCP servers outside the sandbox.
  - *For the domain* — the scanner flags mock exchange connections with key fields. The frontend has no
    use for exchange credentials, so the contract carries a connection's status and never its keys. That
    is an input to D-03 and D-04, and the scanner then checks the design too.
  - *Growth path* — CI runs the same scanner on every push, and GitHub's push protection guards the
    server (D-11). A report-only CSP with an endpoint arrives once monitoring exists (D-19). Nonces are
    needed if the public zone moves to server rendering (D-16).

### D-23 — How do new packages get into the project, and how do we keep them up to date?

`Accepted` 2026-09-10 · needed by plan 02 · build now · judged by QR-24, QR-25, QR-11, QR-13, QR-23

**What we are deciding.** Every package we install is code written by strangers. It runs on our
machines, and some of it runs in our users' browsers. Attacks now come through that door:
- a hijacked maintainer account publishes a poisoned version, and the registry and the community need
  time to spot it;
- install scripts steal credentials;
- AI assistants invent package names that attackers then register.

The defences:
- admit each package deliberately;
- wait before trusting a fresh version;
- refuse code that runs at install time;
- check for known vulnerabilities on every run.

The opposite risk is standing still: a lockfile nobody updates ages into known vulnerabilities. We decide
how much the package manager already enforces, what we add to it, and what stays a human step.

**Not decided here:**
- which packages each plan needs (their own decisions);
- the update bot in CI (D-11);
- secret scanning (D-21).

| Criterion | A — Bun's own controls, configured | B — A + OSV-Scanner | C — A + Socket | D — frozen installs only (today) |
|---|---|---|---|---|
| QR-24 a fresh version waits (quarantine) | ⚠️ `minimumReleaseAge` blocked a 3-day-old version (exit 1), but let it through when the local cache already held it — in 5 of 6 such runs; with `[install.cache] disableManifest = true` it blocked again (CC-02) | ⚠️ as A | ⚠️ as A, plus Socket's own checks ❓ not run | ❌ |
| A reviewed security fix can skip the wait | ✅ `minimumReleaseAgeExcludes` let exactly one named package through | ✅ as A | ✅ as A | — |
| QR-24 code that runs at install | ✅ a named `trustedDependencies` list replaces Bun's built-in list of 367 packages. The built-in list includes `better-sqlite3`; its node-gyp build ran under it and did not with a named list. An empty list is ignored (plan 01) | ✅ as A | ✅ as A | ❌ the built-in list applies |
| QR-24 known vulnerabilities, in `check` | ✅ `bun audit`: 5 advisories on lodash 4.17.20, exit 1; `--audit-level` sets the threshold; our tree is clean (235 packages, 328 ms) | ⚠️ OSV-Scanner 2.5.1 reads `bun.lock` but found 3 of the same 5 — no extra coverage | ❓ not run | ❌ |
| QR-24 exact versions | ✅ `exact = true` saved `2.5.12` with no caret | ✅ as A | ✅ as A | ⚠️ the template's 8 ranges stay |
| QR-25 updates on purpose | ✅ `bun outdated` and `bun update` in batches, each through `check`; the quarantine applies to updates as well | ✅ as A | ✅ as A | ❌ nothing prompts an update |
| What it adds | ✅ one config file | ⚠️ one more binary | ❌ an account and an API token (a secret to manage), and a service that reads our dependency list | ✅ nothing |

- **Decision:** Bun's own controls, set in a committed `bunfig.toml`, plus two human steps.
  - *Quarantine* — `minimumReleaseAge = 604800` (7 days), with `disableManifest = true` so a warm cache
    cannot wave a fresh version through (CC-02). `minimumReleaseAgeExcludes` names a package only for a
    reviewed security fix, and the entry is removed once the version has aged.
  - *Exact versions* — `exact = true`, and the template's eight ranges are pinned exactly in the same
    commit.
  - *No install-time code* — `trustedDependencies` is an explicit list. Nothing we install needs a
    script today, and Bun ignores an empty list, so the list holds one placeholder, `"!none"`, which can
    never be a package name. With it, `better-sqlite3`'s node-gyp build did not run; under the built-in
    list it did.
  - *Known vulnerabilities* — `bun audit` runs in `check`, and any advisory fails it. An advisory that
    cannot be fixed is ignored by its ID, with a written reason — never to make `check` pass quietly.
  - *Admission, a human step* — before proposing a package, the agent verifies it in the registry and its
    repository: name, age, maintainers, provenance, maintenance health. It writes down the reason, and
    the author approves; the agent's settings make every package command ask.
  - *Updates, a human step* — one batch at the start of each plan: `bun outdated`, then `bun update` for
    the batch, majors one at a time with the changelog read, each batch one commit through `check`.
- **Evidence:** measured 2026-09-10 on scratch projects with Bun 1.4.2.
  - *Quarantine* — see the table. A frozen install from our own lockfile passed although it holds
    oxlint 1.82.0, which is 3 days old. So the quarantine guards the moment a version is added, not
    reinstalls.
  - *Built-in trust* — `bun pm default-trusted` lists 367 packages, `better-sqlite3` among them.
    `bun pm untrusted` reports 0 blocked in our tree today, because everything with scripts is on that
    list. With `trustedDependencies: ["!none"]`, `better-sqlite3` 13.0.3 installed with exit 0 and no
    `build/` directory; with the built-in list, node-gyp left `Makefile`, `config.gypi` and `Release/`
    behind.
  - *Audit and exact versions* — as in the table; OSV-Scanner's report is from the same lockfile.
  - *Socket* — the npm `socket` CLI 1.1.170; it was not run, because it needs an account.
- **Wrong if:**
  - Bun closes the cache hole — then `disableManifest` goes, if it costs install time;
  - `disableManifest` makes installs painfully slow — then package changes run in Docker, whose cache
    starts empty;
  - a package we need requires an install script — then it joins the list by name, with a reason;
  - `check` drowns in advisories deep in the tree that cannot be fixed — then `--audit-level=high`, with
    the reason recorded;
  - a Bun release changes how the placeholder is read — so the proof is repeated whenever Bun is
    updated. The fallback: host installs skip scripts, and the hooks of D-25 are switched on by a
    documented command instead (an amendment to D-25).
- **Where it leads:**
  - *Gains* — a poisoned fresh version waits a week before it can reach us, even from a warm cache. No
    stranger's code runs at install. A known vulnerability fails the same gate as a type error. Every
    version is exact, so an update always shows up in `package.json`.
  - *Costs* — `bunfig.toml`'s placeholder needs its explanation. Every install fetches fresh metadata.
    Security fixes wait up to a week unless named by hand. Admission and update batches remain human
    steps, which `ARCHITECTURE.md` names as such (QR-7).
  - *Growth path* — in CI (D-11), a bot proposes updates on the same quarantine, and a fresh cache
    re-checks every lockfile change. OSV-Scanner earns its place when a second ecosystem arrives, for
    example a Python AI service (DR-5). Provenance checks arrive when Bun supports them.

### D-16 — How do we divide the code so everyone knows where things go, and the parts of the product stay apart?

`Accepted` 2026-09-11 · needed by plan 03 · build now (page modules, shared layers, the app zone), design for (the
public and support zones, rendering) · judged by FR-1, FR-2, DR-1, DR-4, DR-8, QR-8, QR-17, QR-21, QR-23

**What we are deciding.** Every screen draws on the same building blocks: the look and feel, the
connection to the server, the rules for money. The product also serves three kinds of people:
taxpayers, visitors to the public site and the support team. Their parts must not leak into each other.
The question is how the code is divided, so that a developer always knows where something goes and the
parts cannot quietly grow into each other. Grouping everything by feature keeps a screen together, but
it tangles the shared rules into screens. Grouping everything by technical role keeps the shared parts
clean, but it scatters one screen across many folders. It is decided now because every later plan adds
code, and the rules must exist before the code does.

**Not decided here:**
- routing (D-05);
- where generated types sit inside the server layer (D-03, D-24);
- permissions and the support zone's guard (D-18);
- the UI kit and what `ui` wraps (D-07);
- where test files live (D-09).

| Criterion | A — Feature-Sliced Design | B — feature folders over flat shared code | C — page modules in actor zones, over shared layers by role | D — page code in the router's route tree |
|---|---|---|---|---|
| FR-1 a new hire knows where code goes | ⚠️ the widget / feature / entity split is what teams argue about | ✅ | ✅ a screen is one folder with a fixed shape; shared code is grouped by role, one purpose per folder | ⚠️ needs the router's file conventions first |
| FR-2 enforced, type imports included | ⚠️ its linter `steiger` 0.6.0 is a second, pre-1.0 tool | ✅ the same local rule | ✅ spiked: 14 of 14 violations, each with the right reason; 22 allowed imports silent | ⚠️ route files import each other by design |
| DR-8 domain and server layer usable outside the web | ⚠️ an entity holds its UI together with its model | ❌ a feature mixes calls, types and components; D-01's DOM-free domain would be split per feature | ✅ React refused in `domain` (spiked); `react-dom` and DOM globals refused in `api` (CC-04) | ⚠️ as B |
| DR-1, DR-4 zones separable | ✅ | ⚠️ a feature spans zones | ✅ zones never import one another (spiked); a zone meets the router only through its `index.ts` | ✅ a zone is a route subtree |
| QR-8 no structure without a tenant | ❌ three layers empty for one page | ✅ | ✅ only `app/` exists; other zones and shared composites arrive with their first file | ✅ |
| QR-17 "add a page" recipe | ⚠️ a page, and perhaps a widget and a feature | ✅ | ✅ a folder with its `index.ts`, one line in the zone's `index.ts`, its route | ⚠️ |
| Prior art (S4) | ⚠️ rejected in we-travel-template: "a larger vocabulary than the domain needs" | ⚠️ we-travel-template removed its `features/` layer: every slice had one consumer, its own page | ✅ careero's zones plus we-travel-template's page modules and barrels | ❓ |
| QR-21 the company's stack | ❓ their structure is not public | ❓ | ❓ · ✅ fits TanStack Router, whose routes folder is configurable | ✅ the company's router's idiom · ❌ chooses routing ahead of plan 05 (D-05) |
| Cost today | ⚠️ six layers to explain and map | ✅ | ✅ one local rule of about 90 lines, spike done | ❌ needs the router now |
| Cost of changing later | ⚠️ | ⚠️ pulling shared rules out of features | ✅ a zone or a layer is one line in the map | ⚠️ |

- **Decision:** page modules inside actor zones, over shared layers grouped by role. A screen is one
  folder that owns everything only it uses, and it exposes nothing but its `index.ts`. One local lint rule
  resolves every import, whether written with `@/` or as a relative path, and refuses whatever the layer
  map does not allow.

  ```
  src/
    main.tsx, AppRouter.tsx   the shell: wires the zones through their index.ts
    app/                      the taxpayer's zone, the only zone today
      index.ts                what the router may import
      pages/<Name>/           a page module: index.ts, <Name>Page.tsx, components/, hooks/, sub-pages
      components/             shared by pages of this zone, on a second consumer
    components/               shared by zones, on a second zone
    ui/<Name>/                design-system primitives, one module each (FR-5, D-07)
    api/                      the transport, the generated client and its hooks (FR-3, D-24); no DOM
    domain/                   money and transactions; no React, no DOM (D-01)
  ```

  - *Modules.* A module is a page, a `ui` primitive or a shared composite. Other code imports it only
    through its `index.ts`. Inside a module anything goes, with relative imports.
  - *Pages.*
    - Pages never import one another: not a type, not through `index.ts`.
    - Only the page's own zone `index.ts` reaches it, and only the shell reaches a zone.
  - *Zones.* Zones never import one another.
  - *Shared layers.*
    - `ui` imports only `ui`, `api` imports only `domain`, and `domain` imports only itself.
    - `domain` refuses React. `api` refuses `react-dom` and the DOM globals, so it stays usable by
      React Native. Both are built-in rules.
    - *Amended 2026-09-11 (CC-04), agreed by the author:* this entry first said `api` has no React. That
      contradicted D-24, whose generated TanStack Query hooks live in `api`.
  - *Unknown folders.* A file in a top-level folder the map does not know fails lint, so a new folder
    arrives together with its row.
  - *Imports across modules* use `@/`, through TypeScript's `paths` and Vite's `resolve.tsconfigPaths`.
    The rule resolves relative paths too, so the alias makes imports readable; the rule holds without it.
  - *Zones (design for).* `public/` and `admin/` get their folder and their row with their first page;
    `admin/` also gets its guard (D-18). we-travel-template has no zones because it has a single actor.
    The company has three (§1), and DR-1 asks for a public zone that ships without restructuring the app, so
    the zone level exists from the first page.
  - *Rendering (design for).*
    - The app and support zones are client-rendered, behind sign-in: per-user, data-heavy screens that
      search engines never see.
    - The public zone gets static or server rendering through its own build entry. It reaches the
      shared layers and never another zone.
- **Evidence:** measured 2026-09-10 and 2026-09-11.
  - *Spike v2:* oxlint 1.82.0 ran the local rule on a scratch tree. The tree had two zones and two page
    modules, one of them with a nested sub-page, plus a zone composite, two `ui` modules, `api` and
    `domain`.
    - 14 of 14 violations were reported, each with its reason:
      - the shell reaching a page past its zone;
      - the zone's `index.ts` reaching into a page;
      - another page reached through its `index.ts` (a type import), by a lazy `import()` and through its
        internals;
      - a `ui` primitive's internals;
      - a zone composite reaching a page;
      - `ui` importing `api`, and `api` importing a zone;
      - another zone, reached by a page and through its `index.ts`;
      - an unknown folder;
      - React in `api` and `domain` (a value and a type).
    - 22 allowed imports stayed silent, including a nested sub-page that uses its page's components.
    - The first run gave the right count with two wrong reasons: a zone's root (`@/app`) was taken for a
      shell file. It was fixed, and the reason is now checked, not only the count (QR-23).
  - *Spike v1:* the same day, the flat five-layer variant caught 12 of 12.
  - *Registry:*
    - `steiger` 0.6.0 (2026-07-14; 2 maintainers) and `@feature-sliced/steiger-plugin` 0.7.0;
    - `@tanstack/router-plugin` 1.168.37 reads `routesDirectory` from the config;
    - Vite 8.3.0 declares `resolve.tsconfigPaths`, off by default.
  - *Prior art (S4):*
    - careero's `frontend-actor-architecture`: isolated zones, a `no-restricted-imports` block per zone;
    - we-travel-template's `frontend-layering-and-import-boundaries`, with its 2026-09-02 amendment:
      pages own their screens, the barrel is the boundary, promotion happens on a second consumer, and
      `@/` is used across modules.
- **Wrong if:**
  - one zone needs another zone's screen (support staff seeing a taxpayer's transactions as the
    taxpayer does). The screen then becomes a shared composite in `components/`. If that becomes the
    norm, zones are the wrong cut;
  - an import form the rule cannot resolve appears: a second alias or `#` subpath imports. The rule
    then learns it, or refuses it;
  - oxlint's JS plugin API (alpha) changes under an update. The rule's fixture then fails in `check`.
- **Where it leads:**
  - *Gains:*
    - a screen is one folder, so finding something takes no search;
    - a module can be rearranged without touching its importers;
    - a zone splits out without untangling pages;
    - `domain` and `api` stay reusable by a React Native app (DR-8);
    - a new top-level folder cannot slip past the rules. That closes the cost D-01 noted, and the one
      we-travel-template's ADR lists: "the override list has to be extended whenever a new top-level
      folder appears".
  - *Costs:*
    - an `index.ts` per module, which can fall out of date with what the module holds;
    - a hand-written rule on an alpha API. It is guarded by a fixture that must fail in exactly the
      expected places on every `check`;
    - on promotion, the choice between `components/` and `ui/` stays a human judgement, named as such in
      `ARCHITECTURE.md` (QR-7);
    - *added 2026-09-11 at plan 03's review:* lint keeps the DOM out of `api` only by its bare globals
      (`window`, `document`, `location`, `navigator`, `history`). `globalThis.document`,
      `self.document` and aliases pass, as with D-21's storage ban; the React Native build is the
      final check. An `import()` whose path is computed is refused, because it cannot be checked.
  - *Growth path:*
    - `components/` on a second consumer;
    - `public/` and `admin/` with their first page;
    - flat helpers such as `lib/` join the map with their first file;
    - `eslint-plugin-boundaries` in the same plugin host if the rule outgrows itself (D-10);
    - packages when a second app appears (D-01).

### D-26 — When the agent starts a container, how much of the machine can that container reach?

`Open` — deferred by the author 2026-09-10: not what this take-home is about · design for · judged by
DR-6, QR-11, QR-7, QR-8, C-2, FR-6

**What we are deciding.** The agent's own commands are boxed in. They cannot read the author's keys or
the project's secrets, and they reach only a short list of sites. The containers the agent starts are
not boxed in. A container runs the project's code, which the agent can change. It also has write access
to the project and an open network. One option removes that power by construction, which is thorough
but constrains every tool that writes into the project. The other asks the author before each start,
which is cheap but rests on attention. The question matters only against an agent steered by text it has
read (prompt injection). A compromised package already runs with the author's own rights whenever the
author runs the project, and D-23 is the guard there.

**Not decided here:**
- package admission (D-23);
- the sandbox itself, and the routes already closed (D-21, CC-03);
- browsers in Docker (D-09).

| Criterion | A — the project read-only in containers | B — every container start asks the author | C — name the gap only | D — B, plus `.claude` and `.git` read-only in containers |
|---|---|---|---|---|
| DR-6 writes to the host (a compose override, `.claude`, `.git/config`) | ✅ closed by construction | ⚠️ a person before each start; the prompt shows the command, not the files changed before it | ❌ open, no prompt | ✅ the two control folders closed by construction · ⚠️ the rest by the prompt |
| DR-6 the container reads `.env` and has an open network | ❌ still open: read-only does not stop reading | ⚠️ by the prompt | ❌ | ⚠️ by the prompt |
| C-2 a fresh clone | ⚠️ needs a tracked `node_modules/` placeholder, without which the container does not start (measured) | ✅ | ✅ | ❓ both folders exist in every clone; not measured |
| FR-6 `check` in Docker | ❌ `bun audit` opens `package.json` for writing and fails (measured) | ✅ | ✅ | ❓ not measured |
| QR-8 pragmatism | ⚠️ a special layout for a threat that exists only in the agent's session | ✅ one settings change | ✅ | ✅ |
| Cost today | ~30 min, plus unknowns (Vite's dev server not measured) | ~5 min | ~5 min | ~10 min with the proof |
| Cost of changing later | ❌ every tool that writes into the tree must be redirected — Playwright's `test-results/` first (D-09) | ✅ one line; 2–5 prompts per plan; the hooks are unaffected | ❌ a sandbox with a known silent bypass | as B |

- **Evidence:** measured 2026-09-10 at plan 02's wrap-up, in a fresh clone of `build/02-gates` with the
  project mounted `.:/app:ro`:
  - without a `node_modules` directory in the clone, the container did not start: `make mountpoint
    "/app/node_modules": ... read-only file system`;
  - with one, format, lint, typecheck, build and the secrets scan passed, and `bun audit` failed with
    `EROFS: Read-only file system: could not open "/app/package.json"`.
- **Where it leads:** until this is decided, `CLAUDE.md` and `ARCHITECTURE.md` name the gap: the agent's
  docker commands are pre-approved, and a container they start is outside the sandbox. It is revisited
  when D-09 puts browsers into Compose, because the mount layout is reopened there anyway.

## Course corrections

When evidence overturns an assumption — even one never written down — the earlier reasoning stays and
the correction is recorded here, dated, with what triggered it. This is the chain of thought
`ARCHITECTURE.md` retells.

### CC-01 — The contract generator we assumed is no longer maintained · 2026-09-10

- **Assumed:** `openapi-typescript` turns the contract into types, as in the author's earlier template. D-22 therefore chose TypeScript 6.0.3, because the generator crashes on 7.
- **Found:** measured while explaining that crash — 6.3 M weekly downloads, yet no release since 2026-02-11, no human commit among the last 100 on `main`, not one maintainer reply on the TypeScript 6 issue (#2723, open since March) or the TypeScript 7 issue (#2841), and its core dependency a major behind (`@redocly/openapi-core` ^1.34 against 2.51).
- **Changed:** the generator moves out of D-03 into D-24, decided before D-22 because the compiler version depends on it; D-22 stays `Proposed`, on hold; QR-24 now checks a package's maintenance health, not only its identity.
- **Lesson:** popularity is not maintenance. A dependency's health is an input to a decision, measured like any other.
- **Outcome:** D-24 chose `orval`, which needs no compiler API; the rest of the chain was then checked on TypeScript 7, and D-22's proposal moved from 6.0.3 to 7.0.2 — the migration it was protecting against is gone.

### CC-02 — The package manager's quarantine lets a fresh version through from a warm cache · 2026-09-10

- **Assumed:** D-02 counted Bun's `minimumReleaseAge` as the quarantine QR-24 asks for. The first spike
  seemed to confirm it: with a 7-day quarantine, a version published that morning was refused.
- **Found:** when the local cache already held a 3-day-old version (installed without a quarantine),
  the same setting let it through in 5 of 6 runs. An empty cache blocked it every time. A controlled
  repeat reproduced it: install without a quarantine, then with one, into the same cache — exit 0.
  `[install.cache] disableManifest = true` blocked it again. A frozen install does not re-check at all;
  the quarantine guards only the moment a version is added.
- **Changed:** D-23 sets `disableManifest = true`, and treats the quarantine as a guard on adding
  versions, not a re-check of the lockfile. The CI growth path starts from a fresh cache.
- **Lesson:** a control is trusted only once it has been seen holding in the state it will actually run
  in — here, a warm cache on a developer's machine — not only in a clean spike.

### CC-03 — Docker outside the sandbox was assumed to be guarded by the permission rules · 2026-09-10

- **Assumed:** D-21 kept Docker outside the sandbox "so the narrowed permission rules remain its only
  guard", and `CLAUDE.md` said the same.
- **Found:** at plan 02's security review. The rules pre-approve the agent's `docker compose build`, `up`
  and `run --rm check`, so nothing guarded them. Anything that decides what docker does was therefore a
  way out of the sandbox, with no prompt:
  - compose merges `compose.override.yaml` on its own, and `COMPOSE_FILE` in `.env` swaps the compose
    file (both measured in a scratch project). Either can add a host mount such as `~/.ssh`;
  - `~/.docker/cli-plugins/docker-compose` is a symlink, and `~/.docker` was writable from the sandbox;
  - a container runs project code with write access to the tree (including `.claude/settings.json` and
    `.git/config`) and an open network.
- **Changed:** the sandbox now refuses writes to the compose files, `.env` and `~/.docker` (`6f0aead`,
  each proven with EPERM). The container route became D-26, left open and deferred by the author.
- **Lesson:** an exclusion from a sandbox is only as narrow as everything the excluded program reads.
  List those inputs before trusting the exclusion.

### CC-04 — The server layer was assumed to be free of React · 2026-09-11

- **Assumed:** DR-8 asked the domain and the API layer to import no React. D-01 repeated it, and D-16
  (accepted the same day) wrote it into the layer map.
- **Found:** the author walked through the page example and pointed out the usual shape: a transport,
  plus generated hooks that call it. D-24, accepted in plan 01, had already chosen exactly that: `orval`
  generates TanStack Query hooks that go through our transport. Those hooks import React, so the rule
  would have refused what D-24 accepted. DR-8 exists for reuse by React Native, and React Native runs
  React and TanStack Query. What blocks reuse is the DOM, not React.
- **Changed:**
  - DR-8 now asks the domain for no React and no DOM, and the API layer for no DOM and no `react-dom`;
  - D-16 and D-01 carry dated amendments;
  - plan 03 bans React in `src/domain/**` only, and `react-dom` and the DOM globals in `src/api/**`.
- **Lesson:** a new decision is checked against every accepted one, not only against the requirements.
  This contradiction sat between two accepted entries.

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
