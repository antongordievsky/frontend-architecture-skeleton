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
| QR-9 | **Performance budgets with regression tests, runnable on a slow machine** | the product is table-heavy; a regression on a 10 000-row screen is a product bug | a production bundle-size budget fails `check`; a browser perf test opens the transactions page on the QR-6 dataset under CPU and network throttling and asserts interaction budgets (numbers measured and fixed in D-20); the same throttled run is one command locally. *Scoped 2026-09-11, agreed by the author:* the bundle-size budget is built; the throttled browser perf test and its interaction budgets are skipped on purpose, for time, and `ARCHITECTURE.md` § Skipped says where they land |
| QR-10 | **Observability and metrics through one seam** | S2 lists Sentry; a render failure nobody sees is a failure twice | one reporter module receives render errors, unhandled rejections, failed requests and Web Vitals (LCP, INP, CLS); in development it logs, and swapping the destination is a one-file change; financial data and PII are scrubbed at the seam — covered by a unit test. *Scoped 2026-09-11, agreed by the author:* built in full, Web Vitals included |

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
import pipelines (CSV/XLS parsing); charts; i18n; hosting and deployment. Storybook is not built: parts are
shown and compared through Playwright's stories and gallery (D-14).

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
| D-16 | How do we divide the code so everyone knows where things go, and the parts of the product stay apart? (amended: the shell's routes live in files, D-05) | FR-1, FR-2, DR-1, DR-4, DR-8, QR-8, QR-17, QR-21, QR-23 | plan 03 |
| D-03 | When the server sends data, how do we make sure it is right before a screen shows it? (the generator itself moved to D-24, CC-01) | FR-3, QR-1, QR-2, QR-5, QR-9, DR-2, DR-5, DR-8, QR-8, QR-24, QR-21 | plan 04 |
| D-08 | How do we hold money so that no amount is ever silently wrong? (amended: the minor digits travel with the amount, CC-06) | QR-1, QR-2, QR-3, QR-8, QR-9, QR-21, QR-24 | plan 04 |
| D-27 | How many digits does a screen show for each currency — every digit of the unit (`HUF 1,234.56`), or the local convention (`1235 Ft`)? A domain question, split from D-08 (CC-06) | QR-2, QR-21 | deferred by the author — needs domain research; until then every digit is shown and nothing is rounded (QR-2) |
| D-04 | Where does the demo data come from, and how do we keep it out of what users download? | FR-3, QR-6, QR-11, C-2, QR-5, QR-8, QR-9, QR-24, QR-21 | plan 04 |
| D-17 | How do people sign in, and what does the browser keep so that nobody can steal a session? (design for; amended: the reaction to a 401 is built in plan 05) | DR-2, QR-11, DR-3, DR-8 | plan 04 |
| D-09 | How do we know the product works, and that our tests would notice if it stopped? (amended: mutation testing deferred as future work) | FR-6, QR-12, QR-22, QR-23, QR-4, QR-8, QR-21, QR-24 | plan 04 (first tests) |
| D-05 | How does each address lead to its screen, and how do we stop links and filters in the address from breaking? | FR-4, QR-3, QR-4, FR-2, QR-17, QR-20, DR-1, DR-3, QR-21, QR-24 | plan 05 |
| D-18 | Who may open which screen, and how does a new role arrive without a frontend release? (design for) | DR-3, QR-17, DR-4, DR-8, QR-8, QR-24 | plan 05 |
| D-07 | Which library gives our parts their behaviour, so that everyone can use them — by keyboard, screen reader and touch? | QR-12, FR-5, FR-7, QR-11, QR-24, QR-20, QR-21, QR-8 | plan 06 |
| D-28 | How do we write the look, so the design can change without rewriting the screens? (split from D-07) | FR-5, QR-7, QR-12, QR-22, QR-11, QR-8, QR-24, QR-21, DR-1, QR-17 | plan 06 |
| D-14 | How do we see every part in every state, and notice when a design change breaks one? | FR-5, QR-12, QR-22, QR-23, QR-24, QR-11, QR-8, QR-21, C-2 | plan 06 |
| D-06 | When a screen shows thousands of rows, who decides what is on it: the server, the address, or the browser? | FR-3, FR-7, QR-6, QR-12, QR-9, QR-4, QR-8, QR-24, QR-21 | plan 07 |
| D-29 | What does the product look like, and where does that look come from? | FR-5, QR-12, QR-8, QR-24, QR-22, QR-17, QR-21 | plan 07 |
| D-30 | How does a skeleton show three kinds of user without building three products? | DR-1, DR-2, DR-3, DR-4, FR-4, FR-7, QR-8, QR-11, QR-12, QR-22 | plan 09 |
| D-19 | Observability and metrics | QR-10, DR-7 | plan 10 |
| D-20 | Performance strategy and budgets | QR-9, QR-6 | plan 10 |
| D-11 | CI/CD with agentic checks, and how environments stay close to production (design for) | DR-9, DR-11, QR-15 | plan 11 |
| D-15 | Extent of the AI layer (commands, agents, MCP beyond the baseline; the path to DR-10) | QR-18, QR-19, QR-8, DR-10 | plan 11 |

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
  - *Amended 2026-09-11 (CC-05), agreed by the author:* the version is 8.31.0, admitted before the 7-day quarantine as a reviewed security fix through D-23's exclusion. 8.28.1, the newest version past the quarantine, carries 10 published advisories, and 8.30.0 still two. 8.31.0 fixes all of them and ships `js-yaml` 4.3.2, so the override goes. The review runs in plan 04 before the install; the exclusion is removed at plan 05's update batch.
  - *Amended 2026-09-11 (plan 04), agreed by the author:* `orval` generates the types, the Zod Mini schemas and the calls through our transport. It does not generate mocks: D-04 chose a seeded, hand-written stand-in, so `mock` and `mock.required` are not set, and neither MSW nor faker is installed. The generated hooks go unused (D-03).
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
  - *Amended 2026-09-11 by plan 05a, agreed by the author (CC-08): the lockfile itself is checked too.*
    - A pre-commit gate asks the registry when each version a commit adds to `bun.lock` was published. It
      refuses one younger than the quarantine, unless its name is in `minimumReleaseAgeExcludes`.
    - It fails when the registry cannot be reached.
    - `--all` checks the whole lockfile, and opens each update batch.
    - Bun's resolver already refuses such a version. The gate catches whatever writes the lockfile without
      the resolver.
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

  - *Amended 2026-09-11 by D-05, agreed with plan 05:* the shell is `main.tsx`, `router.ts`, the route
    files in `routes/` and the generated `routeTree.gen.ts`. There is no `AppRouter.tsx`. A route file
    reaches a zone only through its `index.ts`, as any shell file does.
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

### D-03 — When the server sends data, how do we make sure it is right before a screen shows it?

`Accepted` 2026-09-11 · needed by plan 04 · build now · judged by FR-3, QR-1, QR-2, QR-5, QR-9, DR-2, DR-5,
DR-8, QR-8, QR-24, QR-21

**What we are deciding.** Every number on a screen comes from the server. The build already checks our
code against the contract, but it cannot check the data itself. A backend release, a proxy or a
half-finished import can send an amount in the wrong shape, and the screen would show it as if it were
right — in a tax product, the worst kind of failure. We decide whether data is checked when it arrives,
where it becomes the form the screens work with (money as exact whole numbers), who handles failures
and retries, and what carries requests to the server. Checking costs code and time on every load;
trusting the contract costs nothing until the day it is wrong.

**Not decided here:**
- the generator and its version (D-24);
- how amounts and assets are modelled (D-08) — this entry decides only where the conversion happens;
- the mock server and its dataset (D-04);
- sessions and the reaction to an expired one (D-17) — they live in the transport chosen here;
- pagination, sorting and how fresh each screen's data must be (D-06); performance budgets (D-20).

| Criterion | A — trust the contract: generated hooks straight into screens | B — the generator checks (orval's runtime validation) | C — one adapter per resource: check with the generated schema and convert to domain types in the query function | D — as C, but converted in `select`, the cache keeps the server's shape |
|---|---|---|---|---|
| QR-1 a malformed amount (`1.5` instead of a string) | ❌ reached the caller unchanged (measured) | ⚠️ with our transport: not checked at all; on orval's own `fetch`: caught, as a raw `ZodError` (measured) | ✅ `ApiError { kind: 'contract' }` (measured) | ❓ a throw inside `select` not measured |
| FR-3 errors reach the UI as one typed shape | ✅ `ApiError`, through the transport's `ErrorType` | ❌ a `ZodError` from outside the transport | ✅ `ApiError` for every query, typed twice over (probes pass) | ✅ |
| DR-2 the transport is the one exit to the network | ✅ | ⚠️ checking works only on orval's own `fetch`, past our transport; handing the schema to the transport does not compile on 8.28.1 (fixed in 8.31.0) | ✅ | ✅ |
| QR-2 amounts parsed once, at the boundary | ❌ strings reach components | ❌ checked, still strings | ✅ once per response | ⚠️ once per change, per component subscribed |
| FR-3 no hand-written payload type | ✅ | ✅ | ✅ schemas and types generated; only the mapping to domain is ours, and a contract change breaks it at compile time | ✅ |
| D-13 screens get read-only data | ❌ generated models are mutable | ❌ | ✅ domain types are `readonly` | ✅ |
| What the cache holds | the server's shape | the server's shape | ⚠️ domain objects with `bigint`: `JSON.stringify` throws, so persisting or server-rendering app data needs a serializer; unchanged rows keep their identity across a refetch (measured) | ✅ the server's shape, plain JSON |
| QR-9 cost on 10 000 rows (1.35 MB) | ✅ none beyond `JSON.parse` (5.4 ms) | ⚠️ as C | ⚠️ check and convert: +4.6 ms with classic Zod, +15.7 ms with Zod Mini; 500 rows ≤ 0.5 ms | ⚠️ as C, per subscriber |
| QR-8 hand-written code | ✅ none | ✅ none | ⚠️ a query factory and a mapping per resource (≈ 30 lines for transactions) | ⚠️ a hook and a mapping per resource |
| Cost of changing later | ❌ screens built on strings are rewritten when checking arrives | ⚠️ | ✅ the check can move into the transport without touching a screen | ⚠️ writes to the cache (mutations, optimistic updates) must produce the server's shape while screens think in domain types |
| QR-21 the company's stack | ✅ TanStack Query | ✅ | ✅ `queryOptions`, the form router loaders prefetch with (D-05) | ✅ |

The transport under the generated calls — the author asked why not `axios`, the usual choice:

| Criterion | `fetch`, wrapped in our function | `axios` 1.20.0 | `ky` 2.1.0 |
|---|---|---|---|
| DR-2 one place for credentials, the 401 reaction and error mapping | ✅ the function is that place | ✅ interceptors | ✅ hooks |
| DR-5 streamed responses (AI features) | ✅ `ReadableStream` | ⚠️ only through its `fetch` adapter (present since 1.7.0) | ✅ built on `fetch` |
| QR-24 supply-chain record | ✅ nothing to install | ❌ malicious 1.14.1 and 0.30.4 published 2026-03-31 (GHSA-fw8c-xr5c-95f9); 12 advisories July–August 2026, fixed in 1.18.0; one npm maintainer | ⚠️ no advisories; one maintainer; no provenance |
| QR-8 what it adds | ✅ nothing | ⚠️ 1.98 MB unpacked, four runtime dependencies written for Node (`form-data`, `proxy-from-env`, `follow-redirects`, `https-proxy-agent`) | ✅ no dependencies, 452 kB unpacked |
| Familiar to a new hire | ⚠️ no interceptors: the transport function is where they would be | ✅ | ⚠️ |

- **Decision:** screens never see the server's shape. One adapter per resource checks every response
  against the contract and turns it into read-only domain types, money as exact integers, inside the
  query function, so the cache holds what screens use.
  - *Adapters* — `api/<resource>.ts` exports a `queryOptions` factory built from the generated query key
    and request. Its query function checks with the generated schema and maps to `domain` types. Screens
    import adapters only. The generated client sits in `api/generated/`, private to `api`: lint refuses it
    anywhere else, with a fixture case. The generated hooks go unused — D-24's "accept or narrow them".
  - *The check* — generated Zod Mini schemas (`zod.variant: 'mini'`). A failed check is
    `ApiError { kind: 'contract' }`.
  - *Transport* — `api/transport.ts`, the generator's mutator, over the browser's `fetch`: credentials,
    base URL, the 401 reaction (D-17), and one error shape, `network | http | contract`; a cancelled
    request passes through untouched, never as `network`. It exports
    `ErrorType`, which the generator makes every generated call's error type; `Register.defaultError`
    types the adapters' queries the same way.
  - *Cache policy* — `api/queryClient.ts` owns the defaults. Only network failures and 5xx are retried;
    a contract or 4xx error shows at once. Freshness per screen is D-06's.
- **Evidence:** spikes, 2026-09-11, on orval 8.28.1 — the newest version past the D-23 quarantine —
  TypeScript 7.0.2 under our strict flags, zod 4.5.4, TanStack Query 5.102.8, Node 24.21.0, Bun 1.4.2.
  - *A malformed payload* (`baseUnits: 1.5`): generated call through our transport, with and without
    `runtimeValidation` — returned unchanged; orval's own `fetch` with validation — threw a raw
    `ZodError`; the adapter — threw `ApiError { kind: 'contract' }`. Zod Mini refused it too and accepted
    the valid one.
  - *Why B fails with a transport:* orval's source skips response validation when a mutator is set
    (`!verbOptions.mutator`). Its escape hatch, `includeZodSchemaInArguments`, imports the schema as a type
    and fails typecheck (TS1361) and runtime (`ReferenceError`) — orval #4058, fixed by #4059 in 8.31.0,
    which is 1 day old. Validation on orval's own `fetch` failed typecheck as well (TS2552).
  - *Types:* with `ErrorType` exported from the transport, every generated hook's error type became
    `ApiError`; both probes — `data` exactly `readonly Transaction[] | undefined`, `error` exactly
    `ApiError | null` — typecheck for C and for D.
  - *Retries:* with TanStack Query's defaults, one failing query called its function 4 times and showed
    the error after 7.0 s.
  - *Cost:* 10 000 rows, 1 350 KiB, median of 21 runs — `JSON.parse` 5.4 ms; with the classic check
    9.2 ms, plus conversion 10.0 ms; with Zod Mini 18.7 ms, plus conversion 21.2 ms. Zod with this
    contract's schemas, minified: classic 86.7 kB (23.7 kB gzip), Mini 21.8 kB (6.9 kB gzip); today's whole app is
    220 kB (68 kB gzip).
  - *Cache:* `JSON.stringify` of a `bigint` throws `TypeError`; TanStack Query's structural sharing kept
    an unchanged row's object and replaced the changed one.
  - *Cancellation* (a local server that answers after 500 ms; run outside the sandbox, which refuses to
    listen): a component unsubscribing after 100 ms aborted the real request — the signal reached
    `fetch` through the adapter, the generated call and the transport; `fetch` rejected with
    `AbortError`; the server saw the abort; the query went back to `pending`/`idle` with no error.
  - *What the check covers:* it refused a missing field, `"1.5"`, `decimals: 40` and an unknown `kind`,
    dropped an extra field, and accepted `"999"` with 18 decimals — it checks the shape the contract
    describes, not the value.
  - *Registry:* as in the transport table; zod 4.5.4 — MIT, one maintainer, provenance, no dependencies.
- **Wrong if:**
  - app data has to be persisted or server-rendered (offline, SSR) — then a serializer for `bigint`, or
    the conversion moves to `select` (D);
  - D-06 keeps 10 000 rows on the client and D-20's throttled run finds the Mini check in a long task —
    then classic Zod: its check measured 3.5 times faster (3.8 against 13.2 ms), 17 kB gzip heavier;
  - the check through the transport works on orval 8.31.0 (installed in plan 04, CC-05) — then it moves
    there, so no resource can forget it, and adapters keep only the conversion.
- **Where it leads:**
  - *Gains* — an amount in the wrong shape becomes an error state, never a wrong number on a tax screen;
    screens work only with exact, read-only domain types; credentials, 401 and retries each change in one
    file; the server's shape never leaves `api`, so a contract change stops at the adapter. Adding an API
    resource is a recipe (QR-17): the contract, generate, an adapter.
  - *Costs* — an adapter per resource; until the check moves into the transport, each adapter must call
    it, which a test per adapter holds (D-09); a cache of domain objects needs a serializer before it can
    be persisted; about 13 ms of checking per 10 000 rows and 7 kB gzip; the check proves the shape, not
    the value, so it is only as strict as the contract.
  - *Growth path* — the check moves into the transport once orval 8.31.0's schema hand-off proves out in
    plan 04; a second service (DR-5) is a
    second generated client behind the same transport, and streamed answers use `fetch`'s stream; a React
    Native app reuses `api` as it is, because nothing in it touches the DOM.

### D-08 — How do we hold money so that no amount is ever silently wrong?

`Accepted` 2026-09-11 · needed by plan 04 · build now · judged by QR-1, QR-2, QR-3, QR-8, QR-9, QR-21, QR-24

**What we are deciding.** Every figure in a tax report is built from amounts: crypto with up to 18
decimal places, fiat in cents. The browser's ordinary numbers keep about 16 significant digits and turn
0.1 + 0.2 into 0.30000000000000004; a tax product can show neither. We decide how an amount is held in
memory, what stops two different assets — or crypto and euros — from being added together, and where
rounding and formatting happen. A ready-made money library brings tested arithmetic; a small module of our
own brings nothing we do not use. It is decided now because the first page shows amounts.

**Not decided here:**
- where the server's strings become amounts — in the adapter (D-03);
- tax rules and the rounding policy of reports — tax calculation is out of scope (§10);
- fiat valuation at transaction time — it comes from the contract and the dataset (D-04);
- a locale setting for the user — i18n is out of scope (§10).

| Criterion | A — plain data and our own domain module | B — a decimal library (`decimal.js` 10.6.0) | C — a money library as the representation (`dinero.js` 2.0.2, `bigint`) | D — A's plain data, with `dinero.js` as the arithmetic engine inside domain functions |
|---|---|---|---|---|
| QR-2 integers in the smallest unit | ✅ `bigint` units, with the decimals attached | ❌ arbitrary decimals, not base units | ✅ `bigint` amount and exponent | ✅ |
| QR-2 no digit lost | ✅ `1.123456789012345678` formatted exactly; through `Number` it became `1.1234567890123457` | ✅ `0.1 + 0.2 = 0.3` | ✅ `1.000000000000000002` | ✅ |
| QR-1 two known assets, or an asset and fiat, fail to compile | ✅ both refused; with `NoInfer` removed the test failed (TS2578) | ❌ one `Decimal` type for everything | ✅ ETH + BTC refused (TS2345) | ✅ as A |
| QR-1 assets that arrive as data | ⚠️ the compiler sees `string`; a runtime `Result` answers `asset-mismatch` | ❌ nothing checks | ⚠️ a runtime throw, "Objects must have the same currency" | ⚠️ as A |
| The cache and rendering (D-03, D-13) | ✅ plain objects: an unchanged row keeps its identity across a refetch | ❌ every row replaced on every refetch | ❌ each amount carries functions: every row replaced | ✅ as A |
| QR-9 formatting 10 000 amounts exactly | ✅ 7.5 ms (5.9 ms through lossy `Number`) | ❓ | ❓ | ✅ as A |
| Rounding, allocation, conversion | ⚠️ written when first needed; `Intl` rounds half-even for display | ✅ | ✅ half-even, `allocate`, `convert` built in | ✅ from the engine |
| QR-8, QR-24 what it adds | ✅ nothing; about 40 lines | ⚠️ 12.8 kB gzip; one maintainer; last release 2025-07 | ✅ 1.5 kB gzip; provenance; one maintainer; last release 2026-03 | ⚠️ C's package, and a conversion each way |
| Cost of changing later | ✅ D is additive: the engine arrives behind domain functions and the data keeps its shape | ❌ `Decimal` objects spread through the screens | ⚠️ functions in the cache are hard to take back | ✅ |
| QR-21 the company's stack | ❓ their money code is not public; the posting names "blockchain libraries" — `viem`'s `formatUnits` does A's conversion, from a 27.9 MB package with eight dependencies | ❓ | ❓ | ❓ |

- **Decision:** amounts are plain, read-only data in the smallest unit, in `domain/amount.ts` —
  `CryptoAmount<A>` is `{ kind: 'crypto', asset, decimals, units: bigint }` and `FiatAmount<C>` is
  `{ kind: 'fiat', currency, minor: bigint }`. No `number` ever holds an amount.
  - *Identity* — `asset` is the server's asset id, never a ticker. Decimals travel with every amount, so
    precision is never looked up by symbol (§9, per-asset precision).
  - *Arithmetic* — only through domain functions typed with `NoInfer`. Two known assets, or an asset and
    fiat, fail to compile; assets that arrive as data return a `Result` with `asset-mismatch`.
  - *Rounding* — only in a named domain function with an explicit mode. Formatting never changes a stored
    value.
  - *Formatting* — at the render boundary. `formatAmount` builds an exact decimal string and hands it to a
    cached `Intl.NumberFormat`; a currency's minor digits come from `Intl`, so there is no currency table.
    - *Amended 2026-09-11 (CC-06), agreed by the author:* the minor digits travel with every fiat amount,
      as `decimals` does with crypto. The contract's `FiatAmount` gains a required `exponent`, and
      `FiatAmount<C>` becomes `{ kind: 'fiat', currency, exponent, minor: bigint }`. The server that
      produced `minor` states its unit, so the frontend holds no table of currency digits, neither
      `Intl`'s nor its own; `Intl` only groups digits and places the symbol. Rejected:
      - our own ISO 4217 table — it can silently disagree with the backend's, and Ruby's `money`, the
        likely one, already does (CC-06);
      - keeping `Intl`, with the backend sending its units — the backend would round away fractions, and
        the stored unit would depend on the browser's ICU version.
    - How many digits a screen shows is D-27, open. Until it is decided, `formatAmount` shows every digit
      of the unit and rounds nothing (QR-2).
  - *The type-level test (QR-1)* — a file of `@ts-expect-error` lines that `tsc` checks in `check`, so it
    needs no test runner. BigInt literals stay in `domain` (D-13).
- **Evidence:** measured 2026-09-11 on TypeScript 7.0.2 under our strict flags, Node 24.21.0, Bun 1.4.2.
  - *Types* — two known assets, an asset and fiat, a fractional `number` and a mutation each failed to
    compile, and each `@ts-expect-error` was needed; assets typed as `string` compiled, and the runtime
    returned `{ ok: false, error: 'asset-mismatch' }`; the `switch` over `kind` was exhaustive. With
    `NoInfer` removed, `tsc` failed with TS2578 on the two-assets line.
  - *Formatting* — `Intl.NumberFormat` with `maximumFractionDigits: 18` printed a decimal string exactly
    (`1,234,567.123456789012345678`) and rounded half-even on request; minor digits EUR 2, JPY 0, KWD 3;
    `123456n` minor units printed as `1.234,56 €` in `de-DE`. String input was measured on V8 only.
  - *`decimal.js`* — 33.2 kB minified (12.8 kB gzip); TanStack Query's structural sharing replaced an
    unchanged row; `JSON.stringify` works through its `toJSON`.
  - *`dinero.js`* — ETH + BTC refused at compile time (TS2345) and at runtime; `toDecimal` exact; an
    amount's keys are `calculator, formatter, create, toJSON`; `JSON.stringify` throws on its `bigint`;
    structural sharing replaced an unchanged row; 3.6 kB minified (1.5 kB gzip).
  - *Registry* — `decimal.js` 10.6.0 (2025-07-06, one maintainer, no provenance); `big.js` 7.0.1
    (2025-04-21, no bundled types); `bignumber.js` 11.1.5 (2026-07-05); `dinero.js` 2.0.2 (2026-03-13,
    one maintainer, provenance); `viem` 2.56.3 (27.9 MB unpacked, eight dependencies).
- **Wrong if:**
  - arithmetic beyond addition arrives — allocation, currency conversion, tax rounding — then D:
    `dinero.js` behind the domain functions, with the data unchanged;
  - exact string formatting misbehaves on the second browser engine (QR-22) — then `formatAmount` groups
    digits itself;
  - the backend identifies assets by ticker only — then the asset id becomes ticker plus chain, agreed in
    the contract;
  - the backend cannot attach the exponent to each fiat amount (amendment, CC-06) — then a table copied
    from the backend's, with a contract test that compares the two.
- **Where it leads:**
  - *Gains* — an amount cannot lose a digit, or be added to the wrong asset, without a compile error or
    a typed failure; the cache holds plain data, so unchanged rows keep their identity and memoised rows
    stay cheap; nothing to install.
  - *Costs* — arithmetic helpers are ours to write and test, one at a time; assets known only at runtime
    are checked at runtime, not by the compiler, which `ARCHITECTURE.md` names (QR-7); a cache of `bigint`
    needs a serializer before it can be persisted (D-03).
  - *Growth path* — `dinero.js` as the engine once allocation or conversion arrives (D); a branded
    `AssetId` when the contract grows asset ids; the type-level test moves to D-09's runner if that offers
    one.

### D-04 — Where does the demo data come from, and how do we keep it out of what users download?

`Accepted` 2026-09-11 · needed by plan 04 · build now · judged by FR-3, QR-6, QR-11, C-2, QR-5, QR-8, QR-9,
QR-24, QR-21

**What we are deciding.** There is no backend yet, so every screen draws from a stand-in. The stand-in
must behave like the real server closely enough that what works against it works against the backend:
the same requests, errors, delays and cancellations. It must also serve realistic data at realistic scale
— ten thousand transactions, assets with 6 to 24 decimals — so the product is seen under load. And it must
never reach users: stand-in code in the shipped app is dead weight at best and a fake answer at worst. A
stand-in inside the browser is the quickest and most familiar, but it lives in the app's own code. A
stand-in running as its own server is one more moving part, but then the app that is tested is exactly
the app that ships. It is decided now because the first page and the first tests need data.

**Not decided here:**
- pagination, sorting and filtering (D-06, plan 07) — the stand-in serves whatever the contract says;
- the test runner and where browser tests run (D-09);
- performance budgets on this dataset (D-20);
- the session endpoint and the reaction to an expired session (D-17).

| Criterion | A — in the browser: a service worker intercepts requests (MSW 2.15.0), our handlers; MSW in Node for tests | B — generated from the contract: orval's `mock: true`, MSW handlers with random data | C — a mock server that reads the contract (Prism 5.16.0) | D — our own mock service: one Web-standard handler over a seeded dataset, served by Bun in its own container behind `/api`; tests plug the same handler into `fetch` |
|---|---|---|---|---|
| QR-11 no mock in the shipped build | ⚠️ the worker file lives in `public/`, which the build copies whole (measured); handlers kept out only by a build flag | ⚠️ as A | ✅ a separate process | ✅ `mock/` is outside `src/`; lint will refuse an import that leaves `src/` — today it ignores one (measured), so plan 04 closes that with a fixture case |
| D-12 the production form and browser tests get data from the unchanged build | ❌ the production build has no worker: a special build for tests, or an error page | ❌ as A | ✅ Caddy proxies `/api` | ✅ Caddy proxies `/api`; the dev server proxies it too (Vite `server.proxy`) |
| QR-6 a seeded dataset: ≥ 10 000 rows, ≥ 20 assets, 8 and 18 decimals | ✅ with D's generator | ❌ an asset is 10–20 random letters, its decimals drawn 0–36 per amount; 1–10 rows; no paging (generated, read) | ❌ examples or random values per field; no dataset to page through | ✅ 10 000 rows, 22 assets, decimals 6–24, 1 742 amounts past `Number.MAX_SAFE_INTEGER`; same seed, same hash; 5.0 ms (spike) |
| FR-3, QR-5 typed from the contract | ✅ handlers typed with the generated types | ✅ generated | ✅ reads the contract | ✅ typed with the generated types; the whole dataset passes the generated schema (4.4 ms) — a test in `check` turns drift into a failure |
| Behaves like the network: status, errors, cancellation reach the real transport | ✅ | ✅ | ✅ real HTTP | ✅ real HTTP in both forms; in tests the handler receives a `Request` with the caller's signal: aborted at 20 ms → `AbortError`; `failStatus: 503` → `ApiError http 503` through the transport (spike) |
| QR-6 latency and errors switchable | ✅ per-test overrides (`server.use`) — its strongest point | ⚠️ by editing generated handlers | ⚠️ `Prefer` headers pick an example or a status | ✅ handler options (`latencyMs`, `failStatus`), from the environment in the container; ⚠️ no matching language — an odd response in one test means wrapping the handler |
| QR-8, QR-24 what it adds | ⚠️ `msw`: 18 dependencies, 52 packages in all, 6.0 MB, a `postinstall` script | ❌ `msw` and `@faker-js/faker` 10.6.0 (2.9 MB) | ❌ 168 packages; no provenance; a usage-telemetry dependency (`@scarf/scarf`) | ✅ nothing: Bun is already the runtime; about 80 lines (spike) |
| C-2 one command, and what compose gains | ✅ nothing | ✅ nothing | ⚠️ a service and its image | ⚠️ a `mock` service from the image we already build, and a proxy line in Vite and in Caddy |
| DR-2 same origin, as a cookie session will need | ⚠️ same origin, but nothing ever sets a cookie | ⚠️ as A | ✅ `/api` behind the proxy | ✅ `/api` behind the proxy; the CSP's `connect-src 'self'` stays as it is |
| Cost of changing later | ✅ remove the worker | ⚠️ as A | ✅ repoint the proxy | ✅ repoint the proxy to the backend; the handler stays as the test double |
| QR-21 the company's stack | ❓ the posting names neither | ❓ | ❓ | ❓ |

- **Decision:** the stand-in is its own service, never part of the app. `mock/` sits beside `src/` and
  `contract/`:
  - *Handler* — `mock/handler.ts` is one Web-standard function, `(Request) => Promise<Response>`. It
    answers the contract's endpoints from a seeded dataset (`mock/dataset.ts`, a fixed seed), typed with
    the generated types, with errors as the contract's `Problem`.
  - *Server* — `mock/server.ts` is `Bun.serve({ fetch: handler })`, the compose service `mock`, built from
    the image we already have. Seed, size, latency and injected failures come from the environment, with
    defaults, so `docker compose up` needs no setup.
  - *One origin* — the transport's base URL is `/api` everywhere. The dev server proxies it to `mock`, and
    so does Caddy in the production form, so every browser test runs the unchanged production build.
  - *Tests* — the same handler, plugged into `fetch`, serves integration tests. They run the real adapter,
    transport and query client over the same data, with no server and no mocking library.
  - *Guards* — lint refuses an import from `src/` that resolves outside it, with a fixture case; a test in
    `check` checks the whole dataset against the generated schema, and that the same seed gives the same
    data.
- **Evidence:** spikes, 2026-09-11, Bun 1.4.2, TypeScript 7.0.2 under our strict flags, the D-03 spike's
  contract, adapter and transport.
  - *Dataset* — 10 000 rows, 4 091 trades, 22 assets, decimals 6, 7, 8, 9, 10, 18 and 24; the longest amount
    has 29 digits; generated in 5.0 ms (median of 11); seed 42 hashed the same twice and differently from
    seed 43; 1 198 KiB as JSON; the generated schema accepted all of it in 4.4 ms.
  - *Handler* — the first page was 6.2 KiB; a cursor walk read 200 pages and 10 000 rows. Through
    `fetch`: the adapter returned 50 rows whose units are `bigint`; `failStatus: 503` reached the caller as
    `ApiError { kind: 'http', status: 503 }` with the `Problem` body; `latencyMs: 200` answered after
    202 ms; an abort at 20 ms rejected with `AbortError` after 25 ms.
  - *Served* — `Bun.serve` returned bytes identical to the direct call (7 991 bytes); an unknown path gave
    404 with `application/problem+json`. Listening was refused inside the agent's sandbox, so this ran
    outside it.
  - *Generated mocks* — orval 8.28.1 with `mock: true` wrote handlers that draw `asset` as 10–20 random
    letters, `decimals` as 0–36 per amount and `baseUnits` from the pattern, with 1–10 rows per page.
  - *Build* — `public/favicon.svg` appears in the build output, so a worker in `public/` would ship.
  - *Lint* — the D-16 rule stops at imports that resolve outside `src/`: it locates the target, finds no
    layer, and reports nothing.
  - *Registry* — `msw` 2.15.0 (2026-07-08, one maintainer, provenance, 18 dependencies, 52 packages
    counted at their latest versions, 6.0 MB, `postinstall`); `@faker-js/faker` 10.6.0 (2026-08-14,
    2.9 MB); `@stoplight/prism-cli` 5.16.0 (2026-07-17, no provenance, 168 packages); Vite 8.3.0 declares
    `server.proxy`.
- **Wrong if:**
  - tests need many one-off responses per resource — then MSW in Node for tests only, wrapping this
    handler; the service stays;
  - the backend team offers a sandbox API or its own mock — then the proxy points there, and the handler
    stays only as the test double;
  - a screen needs server-side filtering the handler cannot answer simply (D-06) — then the dataset moves
    into Bun's built-in SQLite, behind the same handler.
- **Where it leads:**
  - *Gains* — the build users get is the build every browser test runs; the stand-in cannot leak into
    it, by structure and by lint; one dataset serves development, the production form, browser, performance
    and integration tests; realistic scale from the first page; the same-origin setup a cookie session
    needs; nothing to install.
  - *Costs* — a third service in compose (the agent's sandbox cannot write `compose.yaml`, so that change
    goes through the author); a proxy in Vite and in Caddy; request matching is ours, a `switch` that grows
    with the endpoints; no per-test override language; the `mock` container runs project code with network
    access, the gap D-26 names, unchanged in kind.
  - *Growth path* — a handler file per resource as endpoints grow; the real backend repoints the proxy;
    MSW if per-test overrides multiply, wrapping the same handler; a second service (DR-5) is a second
    proxy route and a second handler.
  - *A backend of our own* — weighed at the author's question and left out. The task asks for a mocked
    API, §10 puts a real backend out of scope, and the company's backend is Ruby, so a TypeScript one would
    be thrown away. The service grows toward one only where the frontend has something to show: `/me`
    and a session cookie if D-17 demonstrates the expired-session flow, and `bun:sqlite` when writes
    arrive.

### D-17 — How do people sign in, and what does the browser keep so that nobody can steal a session?

`Accepted` 2026-09-11 · needed by plan 04 · design for (the transport's part is built now) · judged by DR-2,
QR-11, DR-3, DR-8

**What we are deciding.** Users sign in with email or a social account. After that, something in the
browser proves who they are on every request. Whatever that proof is, a malicious script that gets into
the page can try to take it, and with it a taxpayer's whole financial history. The proof can be a token
the app holds, which works from any domain but can be stolen, or a cookie scripts cannot read, which
cannot be stolen but needs the app and the API on one site. Plan 04 builds the request layer, so the
choice fixes now what it sends and how it reacts to a lost session. Sign-in screens come later.

**Not decided here:** routing and the sign-in page's route (D-05); permissions and route guards (D-18);
the sign-in providers and the backend's auth stack (the backend's choice); the mobile app's flow (DR-8).

| Criterion | A — the backend signs in and keeps the tokens; the browser holds an httpOnly session cookie (the pattern RFC 10017 calls backend-for-frontend; Rails plays that role, no separate service) | B — the app signs in itself (OAuth with PKCE), tokens in memory | C — tokens in browser storage |
|---|---|---|---|
| DR-2, QR-11 no token in the browser | ✅ none exists | ❌ in JavaScript memory | ❌ and it survives the tab |
| A malicious script in the page | ⚠️ can act as the user while the page is open; has nothing to take away | ❌ can read the token and use it elsewhere | ❌ as B, after the tab is closed as well |
| Frontend code | ✅ no auth library; sign-in is a navigation to the backend | ⚠️ an OIDC client, a callback page, a refresh loop | ❌ as B, and D-21's lint refuses the storage |
| the company's Rails backend | ✅ Rails is the confidential client; its CSRF check expects `X-CSRF-Token` | ⚠️ Rails validates tokens instead of sessions | ⚠️ as B |
| App and API on different sites | ⚠️ needs one site: the `/api` proxy (D-04), or a shared parent domain | ✅ | ✅ |
| DR-8 React Native | ⚠️ its own flow, in the platform's part of the transport (D-01) | ✅ one flow for both | ✅ |

- **Decision:** the browser never holds a token. The backend runs sign-in as the confidential client and
  keeps the tokens; the browser holds an httpOnly session cookie, sent to the same site only.
  - *Built now, in plan 04:*
    - the transport sends `credentials: 'same-origin'` — the default, written out, because `include`
      would send the cookie to any origin a misconfigured base URL pointed to;
    - a 401 is `ApiError { kind: 'http', status: 401 }` and is never retried (D-03's cache policy);
    - nothing else: no session query, guard or sign-in page before a screen needs them (QR-8).
    - *Amended 2026-09-11 by the author, at D-18's review:* the reaction to a 401 is built in plan 05,
      not with the first sign-in screen. The shell clears the query cache and sends the user to a sign-in
      page in the public zone, with the address to return to. The page is a stub whose button navigates to
      the backend's `/auth/<provider>`. `/me`, sign-out and the CSRF header still arrive with the first
      real sign-in.
  - *Designed for, with the first sign-in screen:*
    - sign-in is a full-page navigation to the backend's `/auth/<provider>`, from a page in the public
      zone (D-16). No OAuth code runs in the browser;
    - the session is a typed query, `/me`, which also carries the user's permissions (D-18);
    - on a 401, the shell sends the user to sign-in with the current URL to return to. `api` cannot
      import the router, so the query client raises one signal and the shell reacts;
    - signing out, and every 401, clears the query cache, so no financial data outlives the session
      in memory;
    - *CSRF* — the backend sets the session cookie `SameSite=Lax`, which keeps it off cross-site `fetch`
      and `POST`; that is defence in depth only. Every request other than GET, HEAD and OPTIONS carries
      `X-CSRF-Token`, Rails' header, and the transport adds it. The token arrives in the `/me` response,
      agreed with the backend, and the transport holds it in memory. A meta tag or a readable cookie
      would need `document`, which lint refuses in `api` (DR-8), and a meta tag exists only if Rails
      renders the page. The stand-in answers a mutation without the token with 403, as Rails does, so the
      first mutation cannot work until the header is in place.
- **Evidence:** read 2026-09-11.
  - RFC 10017, *OAuth 2.0 for Browser-Based Applications* (BCP 212, August 2026) recommends the
    backend-for-frontend pattern as the most secure: "there are no tokens available to extract from the
    browser".
  - The Rails security guide: requests from scripts pass the CSRF check through the `X-CSRF-Token`
    header, whose value `csrf_meta_tags` renders into `<meta name="csrf-token">`.
  - MDN, `RequestInit.credentials`: `omit`, `same-origin` or `include`, "Defaults to `same-origin`".
  - OWASP's CSRF cheat sheet: `SameSite` "should be treated as a defense-in-depth layer and combined
    with a CSRF token"; for script requests a custom header is preferred; GET, HEAD and OPTIONS "need not
    be appended with a CSRF token header".
  - MDN, `Set-Cookie`: a `Lax` cookie goes cross-site only with a top-level navigation by a safe method,
    never with `fetch()` or `POST`.
  - `.oxlintrc.json`: `document` is a restricted global in `src/api` (CC-04).
  - The D-03 spike's transport used `include`. This entry corrects that before the transport is written.
- **Wrong if:**
  - the app and the API must live on different sites (a CDN domain and `api.` on another registrable
    domain) — then `include`, CORS with credentials and `SameSite=None`, and the CSRF header becomes
    essential;
  - the identity provider's terms require an in-browser flow — then B, tokens in memory only, never in
    storage;
  - the backend issues only bearer tokens for every client — then a thin session layer in front of it
    is the backend's work, not the frontend's.
- **Where it leads:**
  - *Gains* — nothing in the browser to steal; the frontend carries no auth library; a new sign-in
    provider is a backend change and a button.
  - *Costs* — the app and the API must share a site, which D-04's proxy already gives locally; the CSRF
    header must be in place before the first mutation; the local stand-in shows no real session until it
    grows `/me` and a cookie (D-04).
  - *Growth path* — the first sign-in screen brings `/me`, the 401 reaction and sign-out, with the
    stand-in setting a cookie; React Native gets its own credentials part of the transport, with tokens
    in the platform's secure storage (DR-8).

### D-09 — How do we know the product works, and that our tests would notice if it stopped?

`Accepted` 2026-09-11 · needed by plan 04 · build now (fast tests and their proof in plan 04, browser tests
with the first page in plan 07) · judged by FR-6, QR-12, QR-22, QR-23, QR-4, QR-8, QR-21, QR-24

**What we are deciding.** Tests decide whether a change is safe to ship. Fast tests run on every commit
and check the rules for money and the path data takes from the server to the screen. Slow tests open the
real app in real browsers and check what a person sees, including someone using only a keyboard or a
screen reader. Each kind costs setup and minutes. And a test that could never fail protects nothing, but
looks as if it does. We decide which tools run which tests, where and when, and how we prove that each
test would catch the fault it was written for. It is decided now because plan 04 writes the first tests.

**Not decided here:** performance tests and their budgets (D-20); CI (D-11); visual regression (D-14).

Fast tests — units, the data path, components. Which runner, and what stands in for the page:

| Criterion | A — Vitest 5.0.0, the page simulated by jsdom 30.0.1, Testing Library | B — Vitest, happy-dom 20.14.3 | C — Vitest browser mode, a real Chromium | D — Playwright component testing (stories and galleries, stable since 1.62) | E — Jest 30.5.1 with jsdom | F — Cypress 16.0.0 component testing | G — Bun's built-in runner |
|---|---|---|---|---|---|---|---|
| D-13 tests run the code that ships | ✅ the component under test carried the compiler's `$[n]` slots | ✅ the same pipeline | ✅ | ✅ our own dev server builds the stories: "Playwright does not compile or serve anything" | ❌ "Jest is not supported by Vite": the compiler would need a second, Babel-only config | ❓ its own Vite integration, not run | ❌ no compiler output: Bun never reads `vite.config.ts` |
| FR-6 the data path through the D-04 handler | ✅ 8 of 8 in 0.9 s: amounts; loading, 50 rows, error, empty through the real adapter, transport and query client | ❓ not run | ✅ | ⚠️ props must be "plain serializable data"; providers and the handler live inside each story | ⚠️ as A, over a second pipeline | ❓ | ⚠️ unit tests passed; `vi.unstubAllGlobals` does not exist |
| Fidelity | ⚠️ simulated: no layout, no real focus order | ⚠️ as A | ✅ a real engine | ✅ the three real engines of the browser tests | ⚠️ as A | ✅ a real browser | ⚠️ needs a simulated page too |
| QR-24 record | ✅ jsdom: six maintainers, one advisory (2022, withdrawn), 37 packages | ❌ five critical or high advisories 2024–2026, one a VM escape to code execution; one maintainer | ❌ `@vitest/browser`: three critical advisories in 2026 | ✅ none; the same package as the browser tests | ⚠️ no provenance; 238 packages | ⚠️ 146 packages, no provenance; `postinstall` downloads the app binary | ✅ nothing to add |
| Cost | ✅ the image `check` already uses; about a second | ✅ | ❌ browsers wherever tests run | ⚠️ a gallery page and a story per scenario — Storybook's shape (D-14) | ⚠️ a second transform pipeline to keep in step | ❌ a 942 MB image; parallel runs through Cypress Cloud | ✅ fastest: 30 ms for the unit file |
| Adoption, npm downloads in the week to 2026-09-09 | vitest 57.5 M, jsdom 53.3 M, Testing Library 31.4 M | 8.9 M | within vitest | 0.26 M (the older package) | 24.3 M | 3.6 M | — |
| QR-21 the company's stack | ✅ Vitest, named in the posting | ✅ | ✅ | ✅ Playwright, named | ❌ | ❌ | ⚠️ Bun is their runtime, Vitest their runner |

Browser tests — the production build in real engines (D-12):

| Criterion | A — Playwright Test 1.62.1 | B — Cypress 16.0.0 | C — WebdriverIO 9.31.7 | D — Selenium WebDriver 4.49.0 | E — Puppeteer 25.10.0 | F — TestCafe 3.7.6 |
|---|---|---|---|---|---|---|
| QR-22 engines | ✅ Chromium, WebKit and Firefox in one run (measured) | ⚠️ Chrome family, Firefox and WebKit by its docs; its image carries Chrome, Firefox and Edge, no WebKit | ✅ any WebDriver browser, real Safari on a Mac | ✅ as C | ❌ Chrome and Firefox only | ❓ |
| C-2 in Docker | ✅ Microsoft's image, 960 MB: 9 tests, three engines, 4.9 s (measured) | ✅ `cypress/included`, 942 MB (arm64) | ⚠️ browsers and drivers assembled by us | ⚠️ Selenium Grid images | ⚠️ `postinstall` downloads Chrome | ❓ |
| QR-12 accessibility and keyboard | ✅ `@axe-core/playwright` found the two planted violations; Tab reached the button in all three engines | ⚠️ a community axe plugin, not run | ⚠️ an axe package, not run | ⚠️ as C | ⚠️ as C | ❓ |
| Parallel runs, free | ✅ workers locally, shards in CI | ❌ parallelisation goes through Cypress Cloud | ✅ | ✅ through a Grid | ⚠️ it is an automation library; the runner is ours | ❓ |
| QR-24 record | ✅ 3 packages, provenance, no install script; browsers come with the image | ⚠️ 146 packages, no provenance, a binary download on install | ⚠️ 233 packages with its CLI | ✅ 19 packages | ⚠️ a browser download on install | ❌ 361 packages, one maintainer |
| Adoption, npm downloads in the week to 2026-09-09 | 33.9 M | 3.6 M | 1.4 M | 1.1 M | 6.3 M, mostly automation, not testing | 0.1 M |
| QR-21 the company's stack | ✅ named in the posting | ❌ | ❌ | ❌ | ❌ | ❌ |

How many tools — the author asked whether Playwright alone would do, rather than five testing packages:

| Criterion | P1 — Vitest, jsdom and Testing Library for fast tests; Playwright for browser tests | P2 — Playwright alone: Node tests, components and browser tests | P3 — Vitest for logic in Node; Playwright for everything that renders |
|---|---|---|---|
| Testing packages, before axe and Stryker | ⚠️ five | ✅ one | ✅ two |
| QR-21 the company's stack | ⚠️ both named tools, plus jsdom and Testing Library, which the posting does not name | ⚠️ drops Vitest, which it names | ✅ exactly the two it names |
| Units and the data path | ✅ 0.9 s | ✅ 6 of 6 in 0.59 s in Node, `bigint` and `.ts` imports included | ✅ as P1 |
| Components | ⚠️ a simulated page, but it runs in `check` anywhere | ✅ real engines; ⚠️ needs browsers, which `check`'s image lacks | ✅ / ⚠️ as P2 |
| Mutation testing | ✅ the Vitest runner, with per-test coverage: 2.7 s | ⚠️ no Playwright runner; the command runner took 10.9 s and 59 s of CPU against 8.5 s, cannot say which test killed a mutant, and runs the whole suite per mutant | ✅ as P1 |
| Ways to test UI | ❌ two: Testing Library queries and Playwright locators | ✅ one | ✅ one |
| Familiar to a new hire | ✅ | ⚠️ unit tests in Playwright are rare | ✅ |

Proving that tests catch what they claim to (QR-23). What teams at scale do:
- *Coverage gates* are the most common. Google's guidance calls 60 % acceptable, 75 % commendable and
  90 % exemplary, and warns that coverage shows code was run, not that its behaviour was checked. Codecov's
  patch status measures only the lines a change touches.
- *Mutation testing on the change, at review* is Google's model: mutants only on changed, covered lines,
  shown to the author as review comments, for more than 24 000 developers on more than 1 000 projects.
  Over six years and almost 15 million mutants, developers who saw them wrote more tests, and tests that
  left fewer mutants alive. Mutating a whole large code base is, in the paper's words, "impracticable".
- *Meta's ACH* (2025) has a language model write mutants aimed at one concern, then the tests that kill
  them: 10 795 classes, 9 095 mutants, 571 tests.
- *Test first* — a test seen failing before the code exists; *property-based tests* for invariants; and
  *contract tests* where teams meet, which our generated schema and the dataset test already cover
  locally (D-03, D-04).

| Criterion | A — a deliberate break per new test, recorded in the plan's log (today's rule) | B — a coverage threshold in `check` (`@vitest/coverage-v8`) | C — mutation testing of all code in `check` | D — A, plus mutation testing of the code each plan changed, at its wrap-up (Stryker, incremental) | E — D, plus property-based tests for money (`fast-check`) |
|---|---|---|---|---|---|
| Shows an assertion checks behaviour | ⚠️ only for the breaks someone imagines | ❌ counts lines run, not checked | ✅ | ✅ on `amount.ts`: 38 mutants, 2 survived, 3 not covered — an untested `decimals-mismatch` branch and an unused `parseUnits` | ✅ and feeds inputs nobody thought of |
| What teams at scale do | ✅ test-first, and review asking "does it fail without the change?" | ✅ the usual gate | ❌ "impracticable" at scale (Google) | ✅ Google's model: the change, at review | ✅ where invariants matter |
| Cost | ✅ none | ⚠️ 20 packages, and a number to argue about | ❌ grows with the code, on every commit | ⚠️ 161 development packages; seconds per plan today | ⚠️ as D, plus `fast-check` (one maintainer; 4.10.0 released today, inside the quarantine) |
| Runs where pre-commit runs `check` (the agent's sandbox) | ✅ | ✅ | ❌ Stryker listens on a port: `EPERM` in the sandbox, so every agent commit would fail | ✅ outside `check`, as Docker runs | ✅ as D |

- **Decision:** P3 — Vitest for logic, in Node; Playwright for everything that renders, in real engines;
  every test proven by a deliberate break, and the code each plan changed mutation-tested at its wrap-up —
  Google's model, at our scale. Nothing is tested on a simulated page: jsdom and Testing Library are not
  installed. The author's question — one tool instead of five — moved this from P1 to P3.
  - *Logic tests (plan 04)* — Vitest 5.0.0 in Node, with no page: files `*.test.ts` beside the code they
    test, inside the module. Unit tests for `domain`; integration tests for `api` through the D-04 handler plugged into
    `fetch`, so the real adapter, transport and query client run. `check` runs `vitest run` after
    typecheck. The type-level test stays with `tsc` (D-08).
  - *Components (plans 06–07)* — Playwright's component testing. A story per scenario is served by our
    own Vite dev server, so the React Compiler runs, and it is tested in the same engines as the pages.
    Its stories and gallery are Storybook's shape, so D-14 decides whether one set of stories serves both.
    Component tests need browsers, which `check`'s image lacks. Whether they run in pre-commit on the
    Playwright image, or only in the browser profile, is settled with the first component.
    - *Settled 2026-09-11 with plan 06, agreed with its GREEN LIGHT:* component tests and screenshots run in
      the `browser` service, on Microsoft's image (`docker compose run --rm browser`). Pre-push runs them
      after `check`. Pre-commit does not: `check`'s image has no browsers, and the agent's sandbox cannot
      start Docker on every commit. The orchestrator runs them before each commit that changes a part, a
      story or a stylesheet, and the plan's log records it. Plan 07 adds the page tests to the same service.
  - *Browser tests (plan 07)* — `@playwright/test` against `web-prod` (D-12), in their own compose profile
    on Microsoft's image, pinned to the same version. Chromium, WebKit and Firefox: measured, the third
    engine costs seconds. `@axe-core/playwright` runs on every page test, and the transactions page gets
    a keyboard-only pass (QR-12).
  - *Layers* — tests obey the layer map. The rule that refuses an import leaving `src/` (D-04) lets a test
    file reach `mock/` and nothing else, with a fixture case for each.
  - *Proof* — every new test is still proven by a deliberate break, recorded in the log. At each wrap-up,
    Stryker in incremental mode mutates what the plan changed in `domain`, `api` and `mock`, outside
    `check`. Each surviving mutant is killed by a test or recorded with its reason, and the score goes into
    the log. There is no coverage threshold: coverage counts lines run, and the mutation score says more.
    - *Amended 2026-09-11, agreed by the author:* mutation testing is deferred as extra functionality,
      beyond the skeleton. Every test is still proven by a deliberate break, recorded in the plan's log
      (QR-23).
      - Why: Stryker's client first pulled a `qs` with three advisories (plan 04, cut 2).
      - What remains: it waits in Part III's "Skipped so far" as future work — a release with the fixed
        client (stryker-js #6177), or a try of 9.6.0.
- **Evidence:** measured and read 2026-09-11, on the D-03, D-04 and D-08 spike code, with the app's Vite
  8.3.0 config, Node 24.21.0, Bun 1.4.2.
  - *Vitest 5.0.0 with jsdom 30.0.1* — 8 of 8 passed in 0.9 s (1.2 s wall). The first run failed one test
    for the right reason: the compiler check looked for a helper name the build renames. The component's
    source then showed `$[n]` slots.
  - *Bun's runner* — the unit file passed in 30 ms. In the component file every test failed:
    `vi.unstubAllGlobals` is not a function, and the component had no compiler output.
  - *Playwright 1.62.1 in `mcr.microsoft.com/playwright:v1.62.1-noble`* — 9 of 9 in 4.9 s across Chromium,
    WebKit and Firefox:
    - Tab focused the button in each engine;
    - axe reported nothing on a clean page, and reported `image-alt` and `button-name` on a page broken on
      purpose;
    - all three engines formatted `1234567.123456789012345678` exactly, rounded half-even
      (`0.125 → 0.12`, `0.135 → 0.14`) and gave EUR 2, JPY 0 and KWD 3 minor digits. That settles D-08's
      open risk for these builds of WebKit and Firefox.
  - *Playwright component testing* — the 1.62 release notes move it to stories and galleries; the
    `mount` fixture is in 1.62.1's types; the docs say components "are built and served by your own dev
    server".
  - *Stryker 10.0.0, Vitest runner* — 38 mutants on `amount.ts` in 2.7 s: score 86.84 %, 33 killed, 2
    survived, 3 without coverage. In the sandbox it stopped at `listen EPERM`, so it ran outside.
    Incremental mode stores the last report and re-runs only mutants whose code or tests changed.
  - *Playwright alone (P2)* — Playwright Test ran the unit and data-path tests in Node with no browser: 6 of
    6 in 0.59 s (1.1 s wall). Stryker has runners for Vitest, Jest, Mocha, Karma, Jasmine, Tap and
    Cucumber, and none for Playwright. Its command runner over Playwright reached the same 86.84 % in
    10.9 s wall and 59 s CPU, against 2.7 s and 8.5 s with the Vitest runner. Without coverage it reported
    the 3 uncovered mutants as survivors.
  - *Registry and advisories:*
    - `vitest` 5.0.0 (2026-09-03, five maintainers, provenance; peer `vite ^6.4 || ^7 || ^8`);
    - `jsdom` 30.0.1 (2026-07-29);
    - `happy-dom` 20.14.3 (2026-09-09, one maintainer), with GHSA-37j7-fg3j-429f (critical, VM escape)
      among five;
    - `@vitest/browser`: GHSA-p63j-vcc4-9vmv, GHSA-g8mr-85jm-7xhm, GHSA-2h32-95rg-cppp, all critical;
    - `@playwright/test` 1.63.0 (2026-09-04) is inside the 7-day quarantine until today's end, and
      1.62.1 (2026-07-30) is past it;
    - `cypress` 16.0.0 (two maintainers, no provenance, 146 packages); `cypress/included` 16.0.0 is
      942 MB for arm64;
    - `webdriverio` 9.31.7, `selenium-webdriver` 4.49.0, `puppeteer` 25.10.0 (one advisory, 2020),
      `testcafe` 3.7.6 (one maintainer, 361 packages), `jest` 30.5.1 (no provenance, 238 packages);
    - `@stryker-mutator/core` 10.0.0 (161 packages); `fast-check` 4.10.0; `@axe-core/playwright` 4.13.0;
    - download counts from `api.npmjs.org`, the week 2026-09-03 to 2026-09-09.
  - *Sources:* Jest's getting-started guide (Vite); Cypress's cross-browser guide; Playwright's component
    testing guide and release notes; Google Testing Blog, "Code Coverage Best Practices" (2020);
    Petrović et al., "Practical Mutation Testing at Scale: A view from Google" (TSE 2021) and "Does
    mutation testing improve testing practices?" (ICSE 2021); Foster et al., "Mutation-Guided LLM-based
    Test Generation at Meta" (FSE 2025); StrykerJS's incremental-mode docs; Codecov's commit-status docs.
- **Wrong if:**
  - a wrap-up's mutation run grows past a few minutes, or its survivors are mostly noise — then back to
    A alone;
  - component tests in real browsers make the loop too slow, or keeping them out of pre-commit lets
    component regressions through — then jsdom and Testing Library for components (P1);
  - Linux WebKit in Docker diverges from Safari on a user's device — then a device cloud, with CI (D-11);
  - three engines push the browser suite past D-20's time budget — then Firefox leaves first.
- **Where it leads:**
  - *Gains* — two tools, both the company's; logic tests run in about a second; the data path is tested end to
    end without a server; nothing is tested on a simulated page — components and pages run the compiled
    code in real engines; browser tests see the production build in three engines, with accessibility
    checked on every page; each test's proof is on record, and a tool finds what the author did not think
    to break.
  - *Costs* — component tests need browsers, so they may run later than pre-commit; a 960 MB image for
    browser tests; two runners with two configs; Stryker's 161 development packages, and a mutation run
    per plan to answer.
  - *Growth path* — the mutation run moves into CI on each change, commenting on survivors as Google's
    does (D-11); property-based tests with `fast-check` when D-08's arithmetic grows beyond addition;
    jsdom for a component test only if a real engine proves too slow for it.

### D-05 — How does each address lead to its screen, and how do we stop links and filters in the address from breaking?

`Accepted` 2026-09-11 · needed by plan 05 · build now · judged by FR-4, QR-3, QR-4, FR-2, QR-17, QR-20, DR-1,
DR-3, QR-21, QR-24

**What we are deciding.** Every screen has an address, and users share and bookmark them: a list filtered to
trades, one transaction's details. An address that leads nowhere, or a filter in it that a screen misreads,
is a bug the user sees first, because by default nothing checks addresses. One kind of router checks every
link and every filter against the list of screens when the code is built. The other trusts whatever the
address holds and leaves each screen to check it. Inside the first there is a second choice: the list of
screens is written by hand in one place, or a tool reads it from the files, which means less to write but one
more generated file to keep. It is decided now because plan 05 builds the shell, and every screen hangs on it.

**Not decided here:**
- what the transactions screen keeps in the address, in memory or on the server (D-06);
- who may open which screen, and the guard that enforces it (D-18);
- the sign-in page and the reaction to a lost session (D-17, designed for);
- what the screens look like (D-07).

| Criterion | A — TanStack Router, route files read by its generator | B — TanStack Router, the route tree written by hand in the shell | C — React Router 8, framework mode (its Vite plugin and generated route types) |
|---|---|---|---|
| FR-4 route and search parameters typed | ✅ both, checked by `typecheck`: a link to a missing screen or a filter of the wrong type fails | ✅ the same types, from the hand-written tree | ⚠️ path parameters typed by its typegen; search parameters are a plain `URLSearchParams` in every mode |
| QR-3 one source of types; input validated at the edge | ✅ a filter is a `zod/mini` schema passed as is (Standard Schema, spiked) | ✅ as A | ⚠️ each screen parses the query string itself |
| QR-4 routes code-split; an error boundary in the shell | ✅ `autoCodeSplitting` splits each route's screen · ❓ through D-16's `index.ts` files, counted in the plan | ⚠️ a lazy wrapper per page, written by hand | ✅ route modules split by the plugin |
| FR-2 D-16's structure holds | ⚠️ a new `routes/` folder of thin files that reach a page only through its zone's `index.ts`; one row in the layer map | ✅ exactly D-16's `AppRouter.tsx` | ❌ a route module exports the screen's loader and component, so page code moves into the route tree, the option D-16 rejected |
| QR-17 "add a page" | ✅ a page folder, a line in the zone's `index.ts`, a route file; the tree writes itself | ⚠️ as A, plus a route object and its place in its parent's `children` | ✅ |
| QR-20 generators over hand-written code | ✅ the router's own generator writes the tree | ❌ hand-writes what the generator produces; the router's docs call it "not recommended for most applications" | ✅ its typegen |
| DR-3 a place for the guard | ✅ `beforeLoad` on a layout route, with a typed context that holds the query client | ✅ as A | ⚠️ middleware and loaders · ❓ a typed context |
| DR-1 the public zone moves to static or server rendering | ✅ TanStack Start builds on the same route files | ⚠️ the routes move to files first | ✅ SPA, server and static rendering per route, built in |
| QR-21 the company's stack | ✅ the company's router, in its documented default · ❓ how the company writes its routes | ✅ the company's router | ❌ a second router beside the company's |
| QR-24 supply chain | ⚠️ two packages; the plugin brings Babel 7 and `unplugin` | ✅ one package | ⚠️ two packages; the plugin brings 23 dependencies |
| Cost today | ⚠️ the plugin in `vite.config.ts`; a generated file committed and checked for drift, as the contract is; a layer-map row with its fixture cases | ✅ one file | ❌ a framework plugin that owns the app's entry and folder layout |
| Cost of changing later | ✅ to B and back: file routes and code routes share one API | ✅ as A | ⚠️ leaving it rewrites every link and every hook |

- **Decision:** TanStack Router with file-based routes. Its generator builds the route tree from thin route
  files in `src/routes/`, each of which reaches its screen only through the zone's `index.ts`. Every path
  and search parameter is validated by a schema at its route and typed in every link.
  - *Route files belong to the shell.* They hold the path, the search schema, the guard and the data
    prefetch; the screen stays in its page module (D-16). The layer map learns `routes/` as part of the
    shell, with fixture cases.
  - *Search parameters* are a `zod/mini` schema with `catch`: a malformed filter in a shared link falls back
    to its default instead of breaking the screen, as the router's docs recommend.
  - *Data.* The router's typed context carries the query client. A route's loader prefetches through the
    adapter's `queryOptions` (D-03), so the route and the screen read one cache entry.
  - *Not found and errors.* The root route's `notFoundComponent` answers unknown addresses. The shell holds
    an error boundary (QR-4).
  - *The generated tree* is committed, as the router's FAQ says. `check` regenerates it into a scratch copy
    and compares, as it does for the contract.
- **Evidence:** measured and read 2026-09-11.
  - *Registry:*
    - `@tanstack/react-router` 1.170.35 (2026-09-10). The newest past the 7-day quarantine is 1.170.32
      (2026-08-22). 3 maintainers; peers React ≥ 18.
    - `@tanstack/router-plugin` 1.168.37; past the quarantine, 1.168.35 (2026-08-22), whose peer is
      `@tanstack/react-router ^1.170.32`. It accepts Vite 8 and depends on `@babel/core ^7.29.7`,
      `unplugin ^3.3.0` and `zod ^4.5.4` (ours is 4.5.4).
    - `@tanstack/router-cli` 1.167.35 runs the same generator outside Vite (`tsr generate`).
    - `@tanstack/react-start` 1.168.52.
    - `react-router` 8.3.1 (2026-08-28), 2 maintainers, peers React ≥ 19.2.7. `@react-router/dev` 8.3.1
      has 23 dependencies and 1 maintainer.
  - *TanStack's docs,* on `main` in the TanStack/router repository:
    - code-based routing "is not recommended for most applications";
    - file-based routing "is the preferred and recommended way";
    - the FAQ says to commit `routeTree.gen.ts`: "part of your application's runtime, not a build artifact";
    - the Vite plugin goes before `@vitejs/plugin-react`, and defaults to `./src/routes` and
      `./src/routeTree.gen.ts`;
    - "With Zod v4, you should directly use the schema in `validateSearch`", and `catch` keeps its types;
    - "A route guard is not a data authorization boundary". A route's `beforeLoad` runs before its
      children's.
  - *React Router's docs,* on `main` in the remix-run/react-router repository:
    - typed params and a typed `href` exist in framework mode only (`start/modes.md`), through
      `react-router typegen` (`explanation/type-safety.md`);
    - `useSearchParams` is the same in every mode.
    - TanStack's own comparison table marks React Router's search params as not type-safe; it is a
      vendor's table and is cited only where React Router's docs agree.
  - *Spike:* a `zod/mini` 4.5.4 object carries `~standard` (vendor `zod`, version 1). It validates
    `{ kind: 'trade' }`, reports an issue for `'nope'`, and with `z.catch` falls back instead.
  - *Not measured:*
    - the bundle size of either router. Plan 08's budget measures the one chosen;
    - whether automatic splitting separates pages reached through a zone's `index.ts`. Plan 05 counts the
      chunks.
- **Wrong if:**
  - pages reached through a zone's `index.ts` land in one chunk. Then the zone's `index.ts` exports a lazy
    wrapper per page, as in B, and automatic splitting is switched off;
  - the plugin's Babel 7 pass and the React Compiler's Babel 8 pass conflict in one build. Then B, with no
    plugin;
  - the company's app turns out to write its routes in code. Then B, to match them, at the cost of one file;
  - the public site is built by a content platform rather than by us. Then DR-1's path is a separate site,
    and Start's advantage in the table disappears.
- **Where it leads:**
  - *Gains:*
    - a broken link or a filter of the wrong type fails `typecheck`, before a user meets it;
    - a filter is validated once, at its route, so no screen parses a query string;
    - each screen is its own chunk without anyone writing it;
    - the guard (D-18) and the reaction to a lost session (D-17) each have a place: `beforeLoad` and the
      router's navigation;
    - the public zone has a path to server or static rendering on the same routes.
  - *Costs:*
    - a generated file in the tree, and one more drift step in `check`;
    - a build plugin that runs Babel 7 beside the Compiler's Babel 8;
    - a screen appears in two places, its page module and its route file, which the "add a page" recipe
      names;
    - the router releases weekly, so the quarantine keeps us up to two weeks behind;
    - *added 2026-09-11, CC-07:* pages stay in separate chunks only because `package.json` declares the
      modules free of side effects. A module imported for its side effect must be listed there.
  - *Growth path:*
    - D-06 puts the table's sort, filter and cursor into the transactions route's search schema;
    - D-18's guard becomes a `beforeLoad` on a zone's layout route;
    - the public zone moves to Start with its own entry (D-16);
    - virtual file routes, if the file convention ever fights D-16.

### D-18 — Who may open which screen, and how does a new role arrive without a frontend release?

`Accepted` 2026-09-11 · needed by plan 05 · design for (the error states, the reaction to a 401 and a place for
the guard are built now) · judged by DR-3, QR-17, DR-4, DR-8, QR-8, QR-24

**What we are deciding.** Taxpayers, support staff and, later, accountants working for several clients see
different screens and may do different things. The frontend can be bypassed: anyone can call the API
without it. So the server checks the user's role on every request, and whatever the frontend checks is there
only so that people are not shown what they cannot use. The question is what the frontend checks, and what
it shows when the server says no:
- role names: quick, but every new role, such as "accountant" or "read-only support", needs a frontend
  release;
- rights the server lists: the frontend never learns about roles, but the backend must be able to list the
  rights;
- the server's full rules, evaluated in the browser: they answer questions about a single record too, but the
  policy then lives in two places;
- nothing: every screen asks the server and shows its refusal.

It is decided now because plan 05 builds the route tree and the shell's error screens, and both depend on the
answer. Nothing else is built before the support zone's first page (D-16).

**Not decided here:**
- sign-in and the session that carries the rights (D-17);
- the support zone's screens (DR-4);
- the backend's authorization library, which is the backend's choice.

| Criterion | A — screens follow the API's answers; a list of permissions in the session adds guards | B — role names checked in the frontend | C — the server's rules evaluated in the browser | D — the API's answers only, no check in the frontend |
|---|---|---|---|---|
| The frontend is bypassed: the server checks the role on every request | ✅ the guard is a shortcut; a refused request still shows the server's 403 | ⚠️ a role check in the browser invites trusting it | ⚠️ the browser's copy of the rules can drift from the server's, and a screen believes its own answer | ✅ |
| DR-3 a new role needs no frontend change | ✅ a role is a bundle on the server | ❌ every role is a release | ✅ | ✅ |
| DR-3 `Permission` from the contract, one `can()`, one guard | ✅ an enum in the contract, generated as a union | ❌ checks roles, not permissions | ⚠️ rules are data (action, subject, conditions), and their conditions have no contract type | ❌ nothing to type or guard |
| Rights on one record (an accountant edits one client's transactions, not another's) | ⚠️ a right that depends on the record arrives on the record, computed by the server | ❌ | ✅ conditions per record | ✅ the server refuses |
| DR-3 delegated access not precluded | ✅ the session's permissions are for the account being acted for | ⚠️ | ✅ | ✅ |
| One place for the policy | ✅ the server decides; the browser reads a list | ⚠️ which role sees which screen lives in the frontend | ❌ evaluated in two places that must agree | ✅ |
| No screen the user cannot use | ✅ the guard answers before a request is made | ✅ | ✅ | ⚠️ every link is shown; the refusal comes after a request |
| the company's Rails backend | ⚠️ with Pundit the backend computes the list, because its policies are methods; with CanCanCan the list follows from its rules · ❓ which one the company uses | ✅ | ⚠️ CanCanCan's rules map onto the browser library; Pundit's methods do not | ✅ |
| QR-8, QR-24 | ✅ no package: a type, a function, a guard | ✅ | ⚠️ `@casl/ability` 7.0.1, one maintainer | ✅ |
| DR-8 React Native reuses it | ✅ `can()` is a plain function in `api` | ✅ | ✅ | ✅ |

- **Decision:** the server authorizes every request, and the frontend is assumed bypassed. Screens follow the
  API's answers, and every failure shows a clear, standard state, the same on every route. On top of that,
  the frontend checks permissions, never roles:
  - the session (`/me`, D-17) carries the flat list of permissions the user holds for the account being
    acted for;
  - `Permission` is a union generated from the contract;
  - there is one `can(session, permission)` and one guard, in a layout route's `beforeLoad` (D-05).

  The guard and `can()` only spare the user a request that would be refused. They never stand in for the
  server.
  - *Set by the author at review, 2026-09-11:*
    - the frontend can be bypassed, so it never answers for the server;
    - the single-page app renders a standard set of states from the API's answers, with errors a user
      understands;
    - it sends the user to sign in when the session has ended.
  - *Built now, in plan 05:*
    - the shell turns the typed `ApiError` (D-03) into standard states. Each says what happened and what to
      do next: 403 is no access, 404 is not found, and a contract or network failure is an error with a
      retry;
    - a 401 clears the query cache and sends the user to a sign-in page in the public zone, with the address
      to return to (D-17, amended). The page is a stub: its button is the navigation to the backend's
      sign-in;
    - the app zone's routes sit under one pathless layout route. It exists anyway, for the zone's
      navigation, and it is where the sign-in check and a guard will go;
    - there is no session, `Permission` or `can()` before a screen needs them (QR-8).
  - *Designed for, with the support zone's first page:*
    - the contract lists the permissions as an enum, such as `support:access` and `transactions:write`. The
      session adapter in `api` exports the generated union, because `api/generated` is private (D-03);
    - `can()` sits beside the session adapter in `api`: a plain function that React Native reuses (DR-8);
    - the guard is `beforeLoad` on the support zone's layout route. It reads the session through the query
      client, and a user without `support:access` sees the same 403 state that a refused request shows;
    - a button hides through the same `can()`;
    - a right on one record arrives with the record, as a field the backend computes (`canEdit`). The
      browser never recomputes it;
    - delegated access: the session names the account being acted for. Switching accounts refetches the
      session and clears the cache (D-17).
- **Evidence:** read and measured 2026-09-11.
  - Pundit's README: a policy is a class with predicate methods (`def update?`). The repository was pushed
    2026-08-28 and is not archived.
  - CanCanCan's README: the rules live in an `Ability` class, as data with conditions
    (`can :read, Post, user: user`). The repository was pushed 2026-09-08.
  - Registry: `@casl/ability` 7.0.1 and `@casl/react` 7.0.1 (2026-07-06), one maintainer; the first
    depends on `@ucast/mongo2js`.
  - TanStack Router's docs: "A route guard is not a data authorization boundary". A route's `beforeLoad`
    runs before its children's, so one guard on a layout route covers the zone (D-05).
  - D-17, accepted: `/me` carries the permissions, and signing out clears the cache.
- **Wrong if:**
  - most rights depend on the record, such as rights per wallet or per client across many screens. Then
    fields on records stop scaling, and C, with the backend exporting its rules, is reconsidered;
  - the backend's policies are methods and nobody computes a list. Then `/me` carries only the flags the
    screens use, computed by the backend. That is still A, only a shorter list;
  - the list grows to hundreds. Then the backend sends only what the frontend uses.
- **Where it leads:**
  - *Gains:*
    - a new role is a backend change and nothing else;
    - a renamed or removed permission fails `typecheck` at every use;
    - one line guards a zone;
    - nothing in the browser pretends to enforce;
    - a screen stays right when the session's list is stale, because the server's answer wins;
    - a user always sees what happened and what to do next, whichever request failed.
  - *Costs:*
    - the backend keeps the list and its enum in the contract;
    - a right on one record is a field each resource must carry;
    - a guarded screen still ships in the bundle until the support zone gets its own build (DR-1).
  - *Growth path:*
    - the support zone's first page brings `/me`, the enum, `can()` and the guard;
    - "add a permission" (QR-17): a value in the contract's enum, regenerate, then `can()` where it is used;
    - accountants: an account switcher, and a session per account acted for.

### D-07 — Which library gives our parts their behaviour, so that everyone can use them — by keyboard, screen reader and touch?

`Accepted` 2026-09-11 · needed by plan 06 · build now · judged by QR-12, FR-5, FR-7, QR-11, QR-24, QR-20, QR-21,
QR-8

**What we are deciding.** Menus, selects, searchable lists, dialogs, date pickers and tables follow exact rules for
the keyboard, focus and screen readers. Getting them wrong locks people out, often without anyone on the team
noticing. We want a library that gets these rules right and does nothing else: how the product looks stays
entirely ours. The candidates differ in four ways:
- how much they cover;
- whether they are tested with real screen readers;
- whether they fit the security policy we agreed;
- how healthy the project behind them is.

It is decided now because plan 06 builds the first parts.

**Not decided here:**
- how the parts are styled and themed (D-28);
- the table's data model, and whether TanStack Table computes what the table shows (D-06);
- a component gallery (D-14).

**Candidates.**
- *Out by the author's premise* (below): each of these brings its own look — Material UI 9.4.0, Ant Design
  6.6.2, Fluent UI 9.74.7, React Spectrum S2 1.7.0, HeroUI 3.2.4, Chakra UI 3.37.0 and Radix Themes 3.3.0.
- *Out as unmaintained:* Headless UI 2.2.10 (no commit since 2026-04-13) and Reach UI (last release in 2022).
- *Built side by side:* the rest. Each library got the same select, searchable list, menu and dialog, and all of
  them were driven by the keyboard in a real browser.

| Criterion | A — React Aria Components 1.21.0 | B — Base UI 1.7.0 | C — Radix Primitives 1.6.7 | D — Ark UI 5.39.1 | E — Ariakit 0.4.39 | F — Mantine 9.6.0, headless | G — native HTML only |
|---|---|---|---|---|---|---|---|
| QR-12 keyboard, measured on the four parts | ✅ 4 of 4 | ✅ 4 of 4 | ⚠️ 3: it has no searchable list | ✅ 4 of 4 | ✅ 4 of 4 | ⚠️ no type-ahead in the select; Enter focuses the menu, not its first item | ⚠️ no menu; the select and the list are drawn by the browser and cannot be styled |
| QR-12 axe with the part open (WCAG 2.2 AA) | ⚠️ `aria-hidden-focus` while the list is open | ⚠️ as A | ⚠️ `aria-hidden-focus` in the select and the menu | ✅ none | ✅ none | ⚠️ an unnamed close button; `aria-required-children` in the menu | ✅ none |
| QR-12 tested with real screen readers | ✅ named: VoiceOver on macOS and iOS, JAWS, NVDA and TalkBack, each in named browsers | ⚠️ "a broad spectrum", none named | ⚠️ "commonly used assistive technologies", none named | ❓ not documented | ❓ not documented | ❓ not documented | ✅ the browser's own |
| Announcements and right-to-left in other languages | ✅ strings in 34 locales; right-to-left keyboard | ❓ | ❓ | ⚠️ a locale provider | ❓ | ❓ | ✅ |
| FR-7 parts a data-heavy product needs: table, grid, tree, date picker, long lists | ✅ Table, GridList, Tree, DatePicker, Calendar, Virtualizer and drag and drop, among 70 modules | ⚠️ no table, no date picker (37 parts) | ❌ none of them | ⚠️ a date picker and a tree, no table | ❌ | ⚠️ date pickers in another package, not measured | ❌ |
| QR-11 the agreed CSP, measured | ⚠️ 1 refused `<style>` at load, a touch rule; it takes a nonce when one exists | ✅ 0 with one setting (`CSPProvider disableStyleElements`), 1 without | ❌ 10: scroll locking and the select insert `<style>`, with no switch | ✅ 0 | ✅ 0 | ⚠️ 1 when the dialog opens | ✅ 0 |
| The look is ours | ✅ unstyled; state exposed as `data-*` attributes and render props | ✅ | ✅ | ✅ | ✅ | ⚠️ headless mode drops the token-based props | ⚠️ the native select and list look like the browser's |
| JS for the four parts, gzip, beyond React | ⚠️ 67.8 kB | 63.6 kB | 34.3 kB, without a searchable list | 53.4 kB | 48.5 kB | 59.2 kB | 0.5 kB |
| QR-24 record | ⚠️ no provenance; 2 npm maintainers; Adobe's repository, 86 human commits in the last month; 13 packages | ✅ provenance; 8 maintainers; 64 commits; 9 packages | ⚠️ provenance; no commit since 2026-07-31; 74 packages | ⚠️ provenance; 2 maintainers; 28 commits, plus 60 in its state-machine engine; 90 packages | ⚠️ provenance; pre-1.0; 37 commits; 11 packages | ❌ one maintainer | ✅ |
| QR-20 generated, not hand-written | ✅ its own examples in plain CSS or Tailwind, through the shadcn CLI | ⚠️ shadcn's `base`, Tailwind only | ⚠️ shadcn's `radix`, Tailwind only | ❓ | ❌ | ❌ | — |
| QR-21 the company's stack | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| Adoption, npm downloads in the week to 2026-09-10 | 3.05 M | 9.48 M | 9.98 M | 0.72 M | 0.92 M | 1.78 M | — |

- **Decision:** React Aria Components gives our parts their behaviour. It is the only candidate that names the
  screen readers it is tested with and speaks to them in 34 languages. It passed every keyboard scenario. And it
  covers the parts a data-heavy product lives on: tables, grids, trees, date pickers and long lists.
  - *Set by the author at review, 2026-09-11.* The first draft of this entry was rejected:
    - accessibility has to be shown, not ticked;
    - the sample of libraries was too small;
    - theming is ours, because the design will be updated and will differ;
    - Tailwind is criticised for the volume of its classes, and the kit's modularity was in question.

    The premise behind it: the product will meet competitors, and it lives on its user experience, so over time
    design becomes an advantage people value. No library may decide the look, or limit how an interaction feels.
  - *Why not Radix, the company's choice:*
    - it has no searchable list;
    - the CSP refuses it ten times, and nothing switches those refusals off;
    - it has had no commit in six weeks.
  - *Why not Base UI, the closest:* it equals React Aria on the keyboard and is cleaner under the CSP. But it has no
    table and no date picker, and it does not say which screen readers it is tested with.
  - *Why not Ark UI:* it is the cleanest in the browser, but it has no table, and it depends on 90 packages.
  - *Parts.* They live in `ui/<Name>/` and wrap the library; product code never imports it (lint, FR-5). Plan 06
    adds only what today's screens use (QR-8).
  - *CSP.* The refused touch rule ships in our own stylesheet. Plan 06 either proves that the console stays clean
    under the production CSP, or records the one refusal.
  - *Axe's `aria-hidden-focus` while a searchable list is open.* The library hides the rest of the page from
    screen readers on purpose. Plan 07's browser tests record it as an accepted exception, with that reason.
- **Evidence:** measured 2026-09-11.
  - *The spike.*
    - A scratch Vite app: React 19.2.8 and Vite 8.2.2, the newest versions past the quarantine. One page per
      library, each with the same four parts.
    - Playwright 1.63 alpha, on its Chromium headless shell. axe-core 4.13.0 ran with the WCAG 2.0, 2.1 and 2.2
      A and AA tags. Its target-size rule was left out, because the parts were unstyled.
  - *Scenarios, following the WAI-ARIA Authoring Practices:*
    - select: Tab reaches it, ArrowDown opens it, ArrowDown moves, "c" jumps to Cherry, Enter selects, and focus
      returns;
    - searchable list: typing "ch" leaves one option, then ArrowDown and Enter;
    - menu: Enter opens it on its first item, ArrowDown moves, and Escape returns focus;
    - dialog: Enter opens it, focus moves inside, the dialog is named by its title, Tab stays in the dialog, and
      Escape returns focus.

    Ariakit's dialog and the native one let Tab pass once through the browser's own controls, which the
    Authoring Practices allow.
  - *Rechecks.* The first run had three false failures, each caused by the test itself. Each was rechecked and
    corrected before this table:
    - focus had moved to the browser's own controls;
    - Ark announces the active option through `aria-activedescendant`, which the test did not read;
    - Base UI's `Combobox.Label` labels a trigger. Its input is labelled through `Field.Label`.
  - *CSP.*
    - The Caddyfile's header was served by `vite preview`, and violations were caught with the
      `securitypolicyviolation` event.
    - React Aria's `usePress` prepends one `<style>`, and sets its nonce when it finds one.
    - Radix inserts them through `react-remove-scroll`, and a `<style>` in its select.
    - Mantine inserts one through `react-remove-scroll`, in its modal.
    - Base UI hoists a `<style>` for scrollbars; `disableStyleElements` switches it off.
    - Reading the packages' code first gave wrong answers here (CC-09).
  - *Docs:*
    - React Aria's quality page gives the matrix of screen readers and browsers, and "localized strings for 30+
      languages"; the package ships 34.
    - Base UI's and Radix's accessibility pages.
    - Mantine's unstyled page: "Mantine classes are not applied … Style props will work only with explicit
      values".
    - React Aria's getting-started page: styles come in plain CSS or Tailwind, copied by hand or added with the
      shadcn CLI.
  - *Registry and GitHub:* as in the table. Package counts were resolved from the registry's metadata, and no tree
    has an install script.
- **Wrong if:**
  - React Aria's bundle pushes a page past plan 08's budget. Then Base UI, whose parts match one for one, except
    the table;
  - the table is rendered from TanStack Table's own markup, not React Aria's (D-06). Then React Aria's biggest
    advantage shrinks, and Base UI's health and CSP result weigh more;
  - the company's product is built on Radix, and this skeleton is meant to share its parts;
  - a second browser engine fails a scenario that Chromium passed (plan 07 runs three).
- **Where it leads:**
  - *Gains:*
    - keyboard, focus, screen-reader and touch behaviour come from a library tested with five screen readers;
    - tables, trees and date pickers for a data-heavy product come from the same source;
    - announcements in other languages are ready when i18n arrives (§10);
    - the look stays ours, styled through state attributes.
  - *Costs:*
    - the largest JS of the candidates, about 68 kB gzip for four parts, which plan 08's budget watches;
    - no npm provenance;
    - a deviation from the company's Radix, explained in `ARCHITECTURE.md`;
    - one CSP refusal to neutralise.
  - *Growth path:*
    - parts come from React Aria's plain-CSS examples, one module each (QR-17);
    - the table follows D-06;
    - right-to-left layouts and localized announcements follow i18n.

### D-28 — How do we write the look, so the design can change without rewriting the screens?

`Accepted` 2026-09-11 · needed by plan 06 · build now · judged by FR-5, QR-7, QR-12, QR-22, QR-11, QR-8, QR-24,
QR-21, DR-1, QR-17 · split from D-07 at the author's review

**What we are deciding.** The design will change: refreshed first, then made distinct as competitors appear (the
author's premise, D-07). A redesign must be a change to a small set of named decisions, such as colours, spacing,
type, corners and motion. It must not be a hunt through every screen. The question is how styles are written, and
where those decisions, the design tokens, live.
- Utility classes in the markup are fast to write and familiar. But each part's look is spread across long class
  strings, and every page shares a single global stylesheet.
- Stylesheets beside each part keep its look in one place, and a page ships only the styles it uses. But the rule
  that only tokens are used needs a check of its own.

It is decided now because plan 06 writes every part in the chosen way.

**Not decided here:**
- the library behind the parts' behaviour (D-07);
- fonts and icons, which arrive with their first use;
- a gallery for reviewing themes (D-14).

**Candidates.** Three were built side by side. Each built the same two screens: a card with buttons and a badge,
and a transactions table loaded as its own page. Each had two themes on the same tokens.

Out:
- *Runtime CSS-in-JS* inserts `<style>` while the app runs, and the CSP refuses it: styled-components 6.5.3, and
  Emotion 11.14.0, whose last release was on 2024-12-09.
- *Panda CSS 1.12.0* runs an `esbuild` install script, which our installs block. It has 153 packages and one
  maintainer.
- *StyleX 0.19.0* is pre-1.0, without provenance.

| Criterion | A — Tailwind CSS 4.3.3, `cva` 0.7.1, `tailwind-merge` 3.6.0 | B — CSS Modules and CSS custom properties | C — vanilla-extract 1.21.2 |
|---|---|---|---|
| FR-5 tokens are the single source | ✅ `@theme`, with the default palette removed · ⚠️ arbitrary values (`bg-[#f00]`) bypass it, so a lint rule is needed | ⚠️ any stylesheet can write `#f00` or misspell a variable, so a gate in `check` must refuse both | ✅ a typed theme contract: a theme missing a token, or a style naming an unknown one, fails `typecheck` · ⚠️ raw values are still possible |
| A redesign | ⚠️ tokens change in one place, but a part's look is its class strings, edited part by part | ✅ tokens in one file; each part's look in its own stylesheet | ✅ as B, typed |
| Themes: light, dark, brands | ✅ a set of variables per `[data-theme]`, measured | ✅ measured | ✅ a class per theme, measured |
| What ships on the first screen, measured | ⚠️ JS 9.49 kB, the class helpers; CSS 2.97 kB, Tailwind's reset included | ✅ JS 0.92 kB; CSS 0.87 kB | ✅ JS 0.85 kB; CSS 0.71 kB |
| A page loads only its own styles | ❌ one global stylesheet: the table page brought no CSS of its own | ✅ the table page brought its own 0.22 kB | ✅ 0.20 kB |
| DR-1 the kit can become a package | ⚠️ the app that uses it must scan the kit's source (`@source`); even the spike needed it | ✅ the CSS travels with each part | ✅ the compiled CSS travels with each part |
| Markup, measured on the table page | ❌ 13.4 kB of class attributes; the table's Edit button carries 21 classes, 304 characters | ✅ 3.9 kB; 3 classes | ✅ 2.3 kB; 3 classes |
| QR-12 focus ring and pointer by default | ✅ measured | ✅ measured | ✅ measured |
| QR-22 the browser floor | ⚠️ Tailwind's own, fixed in its code: Chrome 111, Safari 16.4, Firefox 128 | ✅ Vite's target alone | ✅ Vite's target alone |
| QR-24 record | ⚠️ the Vite plugin brings 17 packages with native binaries; `cva` and `tailwind-merge` have one maintainer each | ✅ nothing: Vite's own | ⚠️ the Vite plugin brings 90 packages; 2 human commits in the last month |
| QR-21 the company's stack | ✅ all three named | ❌ | ❌ |
| Familiar to a new hire | ✅ widely known | ✅ plain CSS | ⚠️ styles as TypeScript objects |
| Cost of changing later | ⚠️ class strings rewritten part by part | ✅ plain CSS moves anywhere | ⚠️ styles are TypeScript, to be rewritten |

- **Decision:** CSS Modules, with the design tokens as CSS custom properties.
  - *Tokens.* They live in one file in `ui/`, in up to three tiers:
    - raw values: the palette and the spacing scale;
    - meaning: surface, text, accent, positive, negative, focus;
    - a part's own, where a part needs one: the button's background, for example.

    A theme is one more set of the meaning tier, under `[data-theme]`.
    - *Amended 2026-09-12 by the author, before plan 07:* the product ships **one theme**. The dark set is
      removed from the tokens file, and with it the `prefers-color-scheme` block and the hand-kept copy its
      own § Costs complained about. The mechanism is unchanged and unused: a theme is still one more set of
      the meaning tier, so a dark theme, or a brand's, returns as one block. What this buys is halved
      review: every part's look is approved in one set of images instead of two (D-14's amendment). The
      author's reason: nothing in Part I asked for a dark theme, and it was costing a second baseline per
      state.
  - *Parts.* Each part's look lives in its own `*.module.css`, beside it. It is styled through React Aria's state
    attributes: `[data-focus-visible]`, `[data-pressed]`, `[data-selected]`.
  - *Why not Tailwind, the company's choice:*
    - a part's look is spread across class strings: 21 classes on one button;
    - it takes 9.5 kB of JS to merge them;
    - every page gets one global stylesheet;
    - the kit cannot leave the app unless the app scans it.

    That is the opposite of what we need: a design we will keep changing, and a kit we may share.
  - *Why not vanilla-extract:* its typed contract is the strongest guarantee on tokens. But it brings 90 packages,
    and its repository had two human commits in the last month. It stays on the growth path below.
  - *Enforced (FR-5, QR-7):*
    - a gate in `check`, proven by deliberate breaks, refuses a raw colour in any stylesheet outside the tokens
      file, and any `var(--…)` that the tokens file does not define;
    - `react/forbid-elements` refuses raw interactive elements outside `ui` (probed on oxlint 1.82.0);
    - every interactive part carries a visible focus ring and the pointer cursor in its base style;
    - spacing and type outside the scale are a review rule, named as such in `ARCHITECTURE.md`.
  - *Browsers (QR-22):* one list, set as Vite's `build.target`. The stylesheets compile to it too.
- **Evidence:** measured 2026-09-11, in D-07's spike app.
  - *Measurements:*
    - gzip sizes are read from the build manifest; everything else is read in Chromium;
    - the theme switch changed the button's colour in all three;
    - Tab gave a 2px solid focus ring, over the pointer cursor, in all three;
    - the class attributes were counted on the table page.
  - *Tailwind.* It scanned the whole spike until `source(none)` and `@source` limited it to its own folder. Its
    floor comes from its compatibility page and from the targets in `@tailwindcss/node`; Vite 8's default target
    is Firefox 114.
  - *Registry:*
    - `@vanilla-extract/css` 1.21.2 (2026-07-27) and `@vanilla-extract/vite-plugin` 5.2.6: 5 maintainers,
      provenance;
    - `styled-components` 6.5.3 (2026-08-15); `@emotion/react` 11.14.0 (2024-12-09);
    - `@pandacss/dev` 1.12.0, whose `esbuild` has a `postinstall`;
    - `@stylexjs/stylex` 0.19.0.
  - *GitHub:* `vanilla-extract-css/vanilla-extract` had 2 human commits since 2026-08-11.
- **Wrong if:**
  - the company's team writes Tailwind everywhere, and this skeleton is meant to be continued by them as it is. Then A,
    with the tokens in `@theme`;
  - misspelled or misused tokens keep getting past the gate. Then C, whose contract types every token;
  - parts drift apart visually as they multiply. Then part-tier tokens become mandatory.
- **Where it leads:**
  - *Gains:*
    - a redesign changes the tokens file and the parts' stylesheets, never the screens;
    - a new theme or brand is one more set of meaning tokens;
    - each page loads only its own styles;
    - the markup stays readable;
    - there is no styling package at all;
    - the kit can become a package, with its CSS.
  - *Costs:*
    - a small gate of our own, which keeps tokens the only source of colour;
    - no utility shortcuts: a screen's layout is written in its own module stylesheet;
    - a deviation from the company's Tailwind, explained in `ARCHITECTURE.md`;
    - React Aria's plain-CSS examples have to be adapted to our tokens.
  - *Growth path:*
    - typed tokens, through vanilla-extract's contract or a TypeScript source that generates the tokens file, if
      misspelled tokens become a real class of bug;
    - a design tool's export that generates the tokens file;
    - D-14 decides the gallery where themes are reviewed.

### D-14 — How do we see every part in every state, and notice when a design change breaks one?

`Accepted` 2026-09-11 · needed by plan 06 · build now · judged by FR-5, QR-12, QR-22, QR-23, QR-24, QR-11, QR-8,
QR-21, C-2

**What we are deciding.** Screens are built from parts: buttons, fields, tables. Each part has states a page
rarely shows at once: disabled, focused, in error, in the dark theme. The design will keep changing, and one change
to a colour or a spacing value reaches every part at once, on every screen. Nobody clicks through all of that by
hand after each change. We want each part to be seen, and checked, in each of its states, and the whole app then
checked end to end, with as few tools as possible. The choice is between a separate showcase built for designers
and product people, which brings its own tooling and a hosted review service, and a small showcase that the tests
themselves drive. It is decided now because plan 06 builds the first parts, and the pages are made of them.

**Not decided here:**
- the browser tests of whole pages, and accessibility checks on them (D-09, plan 07);
- whether component tests run in pre-commit or only in the browser profile (D-09, settled with the first part);
- the CI that would host a review flow (D-11);
- performance budgets (D-20).

**Candidates.** Ladle 5.1.1 is out: 453 packages with four install scripts, no release since 2025-11-04, and
0.23 M downloads a week.

| Criterion | A — Storybook 10.6.0 and Chromatic | B — Storybook 10.6.0, locally | C — Playwright's stories and gallery (1.62+) | D — no gallery: pages only |
|---|---|---|---|---|
| D-09 one story is also the component test | ⚠️ Storybook's own story format; tested through Chromatic, or B's runners | ❌ its Vitest addon wants Vitest 3–4 (ours is 5) and `@vitest/browser`, which D-09 refused; its test runner is Jest, which D-09 refused | ✅ the story is what the test mounts; measured in three engines | ⚠️ no component tests: a part is tested only where a page uses it |
| FR-5, D-28 a token change is caught | ✅ in Chromatic's cloud, not run | ⚠️ a screenshot step on top of its runner | ✅ with zero tolerance, one unit of blue failed every light story in all three engines; Playwright's default tolerance let blue → violet through | ⚠️ only the states a page shows: not disabled, error or dark |
| People review every state and theme | ✅ the richest: controls, docs, hosted approvals | ✅ controls and docs, locally | ⚠️ the gallery renders any story by id; a list of stories is ours to add | ❌ |
| C-2, nothing leaves the machine | ❌ a hosted service and CI, which is deferred (DR-9); the rendered UI is uploaded | ✅ | ✅ Microsoft's image D-09 chose: 18 tests in 3.6–4.2 s | ✅ |
| QR-22 three engines | ❓ not run | ❓ not run | ✅ Chromium, WebKit, Firefox | ✅ plan 07 |
| QR-24 packages | ⚠️ 208, an `esbuild` install script | ❌ 564 with its test runner, four install scripts | ✅ none new: `@playwright/test` (3 packages) arrives for D-09 anyway | ✅ none |
| QR-11 record | ⚠️ two high advisories in a year: a built Storybook could carry `.env` values; its dev server's WebSocket could be hijacked (fixed in 10.1.10 and 10.2.10) | ⚠️ as A | ✅ none on record | ✅ |
| QR-8 cost today | ❌ a second dev server, config and story format; an account | ⚠️ as A, without the account | ✅ a gallery page of a few dozen lines, to Playwright's spec; a story per state | ✅ nothing |
| Maturity | ✅ | ✅ | ⚠️ the model is seven weeks old; the older component-testing packages stop being updated in 1.63 | ✅ |
| Cost of changing later | ✅ | ✅ | ⚠️ stories are plain components, so the scenarios carry over, but moving to Storybook wraps each file in its format (not measured) | ⚠️ stories written from nothing |
| QR-21 the company's stack | ✅ both named | ⚠️ Storybook named, its testing is not | ⚠️ Playwright named, Storybook not | ⚠️ |
| Adoption, npm downloads in the week to 2026-09-10 | `storybook` 15.82 M, `chromatic` 6.11 M | 15.82 M | `@playwright/test` 45.34 M; the model within it | — |

- **Decision:** Playwright's stories and gallery. Each part gets one story per state, beside it. That one story does
  three jobs:
  - it is the part's component test;
  - it is the part's visual baseline, in every theme;
  - it is a page in the gallery that people open on the dev server.

  Screenshots are compared with zero tolerance, in three engines, in Microsoft's Playwright image. Pages are then
  tested end to end on the production build (plan 07).
  - *Amended 2026-09-12 by the author, before plan 07, to spend the browser budget where it finds things:*
    - *One theme.* A story is a baseline in the one theme the product ships (D-28's amendment). The
      `colorScheme` loop leaves the specs, and the dark images leave the tree.
    - *Engines by what they catch.* The three engines stay where pixels actually differ between them —
      the kit's parts in the gallery. Whole pages and user flows (plans 08, 09) run in **Chromium and
      WebKit**: QR-22 asks for Chromium "and at least one other engine", and WebKit is the one whose
      layout and focus behaviour differ most from Chromium's. Firefox keeps every part it renders,
      through the gallery.
    - *Cost, named:* a page-level fault that only Firefox shows would be missed. The parts those pages are
      built from are still compared in Firefox, so what is left uncovered is page layout, not a part.
  - *The chain the author asked for:* parts, then stories that test each part and fix its look, then pages built from
    the parts, then the built app end to end. Every link runs in the engines users have, under one tool.
  - *Why not Storybook, the company's choice:*
    - its testing path does not fit our tests: its Vitest addon needs Vitest 3–4 and `@vitest/browser`, and its
      test runner brings Jest (D-09 refused both);
    - it brings 208–564 packages, and had two high advisories in a year;
    - its visual review is Chromatic, a hosted service that needs CI (DR-9).

    Its gallery is better for people; that is its growth path.
  - *Why not pages alone:* the states no page shows — disabled, error, dark — would never be compared, and a token
    change would slip through them.
  - *Zero tolerance.* Playwright's default passes a colour change up to about 0.2 in perceived difference, which
    covers blue → violet. Baselines change only on purpose (`--update-snapshots`), and a reviewer sees them as images
    in the commit.
  - *The gallery* lives in `playwright/gallery/` and is served by our dev server, so the React Compiler and CSS Modules
    run as they do in the app. It is not part of the production build; plan 06 proves that on the build output.
  - *Playwright's component-testing skill* was read: it is instructions only, and it runs nothing. It is not added to
    the repository (QR-18). Its gallery spec is followed.
- **Evidence:** measured 2026-09-11.
  - *The spike:*
    - Playwright 1.62.1 ran in `mcr.microsoft.com/playwright:v1.62.1-noble`, with a gallery to Playwright's contract
      (`window.mount`, `#root`) and three stories: primary, disabled and dark;
    - `mount` rendered each story; Tab reached the button; an unknown story failed the mount;
    - with the default tolerance, the accent changed from `#1d4ed8` to `#2563eb` and every screenshot still passed.
      A probe confirmed the page used the new colour;
    - with zero tolerance, two runs without a change passed 18 of 18;
    - with zero tolerance, `#1d4ed9` (one unit) and `#2563eb` each failed all six light stories and none of the dark
      ones, in all three engines;
    - nine baselines, 36 kB, named per engine and platform (`button-Primary-webkit-linux.png`).
  - *Why the default misses it:* pixelmatch's YIQ colour difference, the one Playwright's comparator uses, was computed
    for these colours. `#1d4ed8` → `#2563eb` needs a tolerance below 0.068 to be caught, and `#1d4ed8` → `#7c3aed`
    needs one below 0.197.
  - *Playwright:*
    - 1.62.0 (2026-07-24) moved component testing to stories and galleries, served by our own dev server, with
      `mount` built into `@playwright/test`;
    - 1.63.0 (2026-09-04) stops updating `@playwright/experimental-ct-react`;
    - its docs: "Browser rendering can vary based on the host OS … run tests in the same environment where the
      baseline screenshots were generated";
    - the component-testing skill ships inside `playwright-core`, with the gallery spec.
  - *Storybook:*
    - `storybook` 10.6.0: provenance, eight maintainers;
    - `@storybook/addon-vitest` 10.6.0 and 11.0.0-alpha.0 both peer `vitest ^3 || ^4` and `@vitest/browser`, and
      issue #36221, "Support Vitest 5", is open since 2026-09-08;
    - `@storybook/test-runner` 0.24.5 depends on Jest 30;
    - advisories GHSA-8452-54wp-rmv6 and GHSA-mjf5-7g4m-gx5w.
  - *Chromatic:* `chromatic` 18.8.1, homepage chromatic.com; `@chromatic-com/playwright` 0.14.12 records Playwright
    tests for it, and brings 83 packages together with `chromatic`.
  - *Package counts* were resolved from the registry's metadata, without an install. Downloads come from
    `api.npmjs.org`, and advisories from GitHub's advisory database.
- **Wrong if:**
  - zero tolerance flakes, so that a run without a change fails. Then a small `maxDiffPixels` per story, recorded
    with its reason;
  - a CI on another CPU architecture renders differently from this machine's image. Then the baselines come from the
    CI's image (D-11);
  - designers or product people need to review states without running the project. Then Storybook and a hosted
    review, with the stories moved into its format;
  - Playwright changes the gallery contract in a minor release. Then pin the version and follow its migration.
- **Where it leads:**
  - *Gains:*
    - one story per state gives a test, a visual baseline and a gallery page;
    - no new package: Playwright arrives for D-09 anyway;
    - a redesign's token change is caught on every part, in each theme and each engine, before a page is opened;
    - it all runs in the image that browser tests already use.
  - *Costs:*
    - the gallery page is ours to keep;
    - no controls or docs pages like Storybook's;
    - baselines are Linux images in the repository, and are compared only inside Docker;
    - at zero tolerance, any rendering change, such as a new image or font, rewrites every baseline, and the image
      is pinned for that reason;
    - the model is young.
  - *Growth path:*
    - a list page in the gallery, then typed story ids through the `Stories` registry (1.63);
    - with CI (D-11), a hosted review of the diffs. Chromatic records Playwright tests without Storybook;
    - Storybook itself, if the gallery becomes a tool for designers and product people.

### D-06 — When a screen shows thousands of rows, who decides what is on it: the server, the address, or the browser?

`Accepted` 2026-09-12 · needed by plan 07 · build now · judged by FR-3, FR-7, QR-6, QR-12, QR-9, QR-4, QR-8,
QR-24, QR-21

**What we are deciding.** The transactions screen is the product's workhorse: a person with years of history
opens it, narrows it to one kind of transaction, sorts it, and sends the link to their accountant. Three
places can hold the answer to "what am I looking at" — the server that owns the records, the address in the
browser's bar, and the screen's own memory. Put it in the wrong place and the symptoms are familiar: a
shared link opens a different list, the back button loses the filter, or the browser drags a whole tax
year's records around to sort them. It is decided now because plan 07 builds this screen, and every later
list in the product will copy whatever it does.

**Not decided here:** how fast it must be, in numbers (D-20); what it looks like (D-07, D-28); who may open
it (D-18); what we learn when it breaks in front of a user (D-19).

| Criterion | A — the server owns the rows, the address owns the question, the screen owns nothing | B — the browser owns everything: one request for the whole set, sorted in memory | C — as A, but a table-model package computes the table (the company's stack) | D — plain page-by-page navigation, no virtualisation |
|---|---|---|---|---|
| FR-3 data through the API layer, one cache entry per question | ✅ cursor pages through the adapter's `queryOptions`, appended as an infinite query | ⚠️ one entry holding 10 000 rows; every filter re-derives from it | ✅ as A | ✅ as A |
| FR-7 four states on the large dataset | ✅ plus the states beyond the first page: loading more, failing while loading more | ⚠️ one long wait, then no further states | ✅ as A | ✅ simplest: each page is its own four states |
| QR-6 10 000 rows; the pagination, sorting and filtering model | ✅ cursor paging is stable when rows are inserted (S5); sorting and filtering are the server's | ⚠️ 2.05 MB and a 66.7 ms schema check before the first row appears (measured) | ✅ as A | ⚠️ the model is fine, but the screen never shows more than a page, so nothing proves the scale |
| QR-12 semantic table, `aria-sort`, keyboard | ✅ the kit's table sets `data-sort-direction` and `aria-sort`, and its rows are keyboard-navigable (types read) | ✅ same markup | ⚠️ the model hands us rows; the markup and its `aria-sort` are still ours to wire | ✅ same markup |
| QR-9 what the user waits for | ✅ 21 kB per page of 100; ~30 rows in the DOM at any time | ❌ 2.05 MB before anything, on every cold visit | ✅ as A | ✅ small pages, but a person scanning history clicks "next" 100 times |
| QR-4 React discipline | ✅ nothing is copied into state that the server or the address already answers | ⚠️ the derived list must be computed during render, or it drifts | ✅ as A | ✅ |
| QR-8 pragmatism — a dependency needs a present consumer | ✅ no new runtime package | ✅ none either | ❌ 34 kB of table model that, with the server sorting, only passes rows through | ✅ |
| QR-24 supply chain | ✅ nothing new | ✅ | ⚠️ a major five weeks old (9.0.0, 2026-08-04) whose API is rewritten — `useReactTable` no longer exists | ✅ |
| QR-21 the company's stack | ⚠️ deviates: the company uses a table-model package; ours is the kit D-07 already chose | ⚠️ as A | ✅ exactly their stack | ⚠️ as A |
| Cost today | ⚠️ the contract gains a sort parameter; the stand-in must honour it; the kit's virtualiser is wired once | ✅ least code | ❌ as A, plus a package and its rewritten API to learn | ✅ least code |
| Cost of changing later | ✅ a model can slot under the same markup when grouping or column resizing arrives | ⚠️ moving work to the server later rewrites the screen's data path | ✅ | ⚠️ adding virtualisation later changes the markup |

- **Decision:** the server owns the rows, the address owns the question, and the screen's memory holds only
  what dies with it.
  - *The server owns the rows.* Pages of 100 by cursor, fetched as an infinite query through the resource
    adapter (D-03), so one cache entry belongs to one filter-and-sort combination and pages are appended to
    it. Sorting and filtering are the server's work: the contract gains a `sort` parameter and the stand-in
    backend implements it (D-04).
  - *The address owns the question.* The kind filter and the sort live in the route's search schema, with
    `catch` defaults (D-05), so a filtered, sorted list is a link a person can share and a back button can
    restore.
  - *The screen owns only the ephemeral* — which rows are ticked (a `Set` of ids) and where the scroll is.
    Nothing the server or the address already answers is copied into React state (QR-4).
  - *The table is the kit's.* React Aria's Table inside its `Virtualizer` with `TableLayout`, so the number
    of rows in the DOM does not grow with the dataset. Columns are data in the page module, not markup
    repeated per row. `TableLoadMoreItem` asks for the next page when the sentinel comes into view.
  - *Nothing is computed from the pages already loaded.* Sorting, filtering, counts, totals, "select all"
    and export answer for the whole matching set, which only the server knows. The kit's column sort writes
    the new order into the address and starts a new query; it never reorders the rows in hand. This is the
    rule that makes the whole decision hold together: a partial answer presented as a complete one is a bug
    the user cannot see — the first page of 100 sorted by value looks exactly like the 100 largest
    transactions, and is not.
  - *A stable order.* The sort key is always paired with the row id as a tiebreaker. A cursor walking a
    non-unique key — two transactions at the same timestamp, two equal fiat values — otherwise repeats a row
    on one page and skips another, and the user sees neither problem.
  - *No table-model package.* With the server sorting and filtering, a headless model would only hand our
    rows back to us (QR-8). The deviation from the company's stack (QR-21) is named here and revisited the moment
    the table needs grouping or resizable columns.
- **Evidence:** measured 2026-09-12 on this machine, Bun 1.4.2, unless stated.
  - *The dataset (D-04's generator, seed 42, 10 000 rows):* the whole set is 2.05 MB of JSON; a page of 100
    is 21 414 bytes, a page of 200 is 42 615 bytes. The contract's `limit` maxes at 200, so the whole set is
    50–100 requests.
  - *The schema check (zod 4.5.4, D-03's adapter):* the whole set 66.7 ms, a page of 100 0.4 ms.
  - *Sorting in the browser is not the expensive part:* 10 000 domain rows sort in 1.7 ms by date and 4.2 ms
    by a `bigint` fiat value, and filter to the 3 030 trades in 0.9 ms. What costs is delivering and checking
    2.05 MB, which is why the work moves to the server rather than the sort itself.
  - *The kit (react-aria-components 1.21.0, installed):* `Column` carries `allowsSorting`, `sortDirection`,
    `sort(direction)` and a `data-sort-direction` selector; `TableLoadMoreItem` wraps a load-more sentinel;
    `Virtualizer` takes a layout and `TableLayout` is exported for tables.
  - *Bundle spike* (`bun build --minify`, React external, gzip -9): the kit's Button alone 13 550 B; the
    Table 57 650 B; Table plus Virtualizer 63 885 B. Against what a screen already ships, the table costs
    about 44 kB and virtualisation 6.2 kB.
  - *The rejected package:* `@tanstack/react-table` 9.2.4 (2026-08-28), whole package 34 423 B gzip, MIT,
    provenance, 3 maintainers, last commit in TanStack/table 2026-09-10, 14.9 M downloads in the week to
    2026-09-10. Its major 9.0.0 is from 2026-08-04 and the React API is rewritten: `useReactTable` is gone,
    replaced by `useTable`/`createTableHook`, with the previous API only under `./legacy`.
    `@tanstack/react-virtual` 3.14.12 (2026-09-11) is inside the quarantine; 3.14.10 (2026-08-18) is past it.
  - *Already in the project:* `@tanstack/react-query` 5.102.8 ships `infiniteQueryOptions`; the contract
    already carries `cursor`, `limit` and `kind`, and no sort.
- **Wrong if:**
  - the screen grows grouping, resizable or reorderable columns, or a reconciliation view across rows — then
    a headless table model earns its 34 kB, and it goes under this same markup;
  - the product wants spreadsheet-style filtering across the whole history without a round trip — then the
    one-request model returns, at the 2.05 MB and 66.7 ms measured above;
  - the kit's virtualised table cannot hold a sticky header, `aria-sort` and keyboard navigation together in
    all three engines — plan 07 measures this; then the table stays unvirtualised and TanStack Virtual is
    reconsidered.
- **Where it leads:**
  - *Gains* — one home per question, so a shared link reproduces the screen exactly; the DOM holds about
    thirty rows whatever the dataset's size; the cache holds domain rows already checked against the
    contract, so a screen never parses money.
  - *Costs* — the contract and the stand-in grow a sort parameter; the four states must also be shown for
    pages after the first; virtualisation gives up the browser's own find-in-page and printing (S5), which
    `ARCHITECTURE.md` records as a named trade.
  - *Named, not built in plan 07* — each would be answered by the server under the rule above, and each is
    a feature, not a seam: sorting by several columns at once; free-text search; a total row and a result
    count (a count over millions of rows is itself a server decision, so screens say "many", not a wrong
    number); jumping to page N, which a cursor cannot do and an offset can; selecting every row that matches
    a filter rather than every row on screen; exporting that same matching set; showing, hiding, resizing and
    reordering columns, and where such a preference lives — the address, or the user's profile on the server.
  - *Growth path* — new filters are one field at a time in the search schema; when the real backend publishes
    its contract, only parameter names change, not the screen; a table model, if it is ever needed, slots
    under the markup without touching the data path.

### D-29 — What does the product look like, and where does that look come from?

`Accepted` 2026-09-12 · needed by plan 07 · build now · judged by FR-5, QR-12, QR-8, QR-24, QR-22, QR-17, QR-21

**What we are deciding.** The skeleton works, and it looks like nothing: a row of links in the browser's default
type on a white page. The first thing anyone opens is a screen, and a screen that looks unfinished is read as work
that is unfinished. At the same time the look must not arrive as a second framework, because the whole point of
how styles are written here (D-28) is that the design is ours to change. So the question is where a finished look
comes from, and how much of the toolchain it is allowed to bring with it.

It is decided now because plan 07 writes the shell every later screen sits in, and because the transactions table
(plan 08) should be photographed once, against the final palette, not twice.

**Not decided here:**
- how styles are written, and where tokens live (D-28);
- which library gives the parts their behaviour (D-07);
- what the three audiences see (D-30);
- icons, which arrive with their first use.

| Criterion | A — keep today's tokens, add only layout | B — re-tune the tokens to a palette proven in the author's other product | C — B plus a self-hosted display font | D — a component library with a theme (Mantine, a Tailwind preset) |
|---|---|---|---|---|
| Looks finished | ❌ browser defaults on white | ✅ cool-neutral surfaces, one accent, shadows and corners that agree | ✅ the most distinct of the four | ✅ someone else's finished look |
| D-28 "a redesign changes the tokens file, never the screens" | ❓ never exercised | ✅ **the redesign is the proof**: the whole palette moves and no screen file changes | ✅ as B | ❌ replaces D-28 |
| QR-8, QR-24 packages | ✅ none | ✅ none | ⚠️ one package, one more asset to serve | ❌ a framework and its tree |
| QR-11 the production CSP | ✅ untouched | ✅ untouched | ⚠️ `font-src 'self'` added in the Caddyfile and in the header check | ⚠️ depends on the library |
| QR-22 the browser floor | ✅ | ✅ hex and `color-mix`, both inside Vite's target | ✅ | ⚠️ the library's own floor |
| QR-12 contrast and focus | ✅ unchanged | ⚠️ every pair is re-checked by axe in the flows | ⚠️ as B | ✅ |
| Cost today | ✅ nothing | ⚠️ one file, plus the parts' stylesheets; the baselines are re-shot once | ⚠️ as B, plus the package ask and the CSP line | ❌ a new styling decision |
| Cost of changing later | — | ✅ one file again | ✅ one file and one asset | ❌ every part rewritten |
| QR-21 the company's stack | ⚠️ neither way | ⚠️ ours, as D-28 already deviates | ⚠️ as B | ✅ Mantine is named |

- **Decision:** B. The token file keeps its three tiers and changes its values, taking them from the palette the
  author already runs in another product (`careero`): cool-neutral surfaces, an indigo accent, a corner and shadow
  scale. No package, no framework, no second stylesheet.
  - *One theme.* The dark set is gone (D-28's amendment). What ships is one palette, and the mechanism for a
    second stays where it was.
  - *Type is a stack, not a download.* `--font-sans` stays a plain sans-serif stack. The baselines are photographed
    on Linux inside Microsoft's Playwright image, so the stack is written to resolve to one family **there** as
    well as on a designer's Mac; plan 07 measures what the image actually resolves before the stack is fixed, and
    records it. A real display font is C, and it is on the growth path, not in this plan.
  - *New tokens the shell needs,* in the tiers that already exist: a corner and shadow scale (raw), and the
    layout's own measurements — the sidebar's width, the header's height, the page's padding (meaning).
  - *What must not change:* no screen's `.tsx` file. If a screen has to be edited to take the new look, that is
    D-28 failing, and the entry is wrong, not the screen.
- **Evidence:** read and counted 2026-09-12.
  - The palette is read from `~/Projects/careero/docs/design/_shared/tokens.css`: surfaces `#f3f5f9 / #fff /
    #eff2f7`, ink `#0f172a / #475569`, lines `#dde1ea`, an indigo accent in `oklch`, a five-step corner scale and
    three shadows. It is a palette in daily use, not one invented here.
  - The tree holds 36 baseline images today (Button 18, Link 18), of which 18 are dark and leave with D-28's
    amendment.
  - `scripts/check-tokens.mjs` already refuses a colour written anywhere but the tokens file, and any `var(--…)`
    the file does not define, so the port cannot be half-done: a value left behind fails `check`.
  - *Not measured:* which family `system-ui` resolves to inside the Playwright image; the contrast ratios of the
    new pairs. Plan 07 measures both, the second through axe.
- **Wrong if:**
  - a real brand arrives from the company. Then its values replace these, in the same file — which is the point;
  - axe finds a contrast pair below AA that cannot be tuned without losing the look. Then the accent moves, not
    the mechanism;
  - the screenshots turn out to depend on a font the image does not have. Then the stack is pinned to what the
    image has, and the difference between the designer's screen and the baseline is recorded.
- **Where it leads:**
  - *Gains:* a screen that looks deliberate; D-28's central promise exercised rather than asserted; no dependency
    added; one theme to review instead of two.
  - *Costs:* the baselines are re-shot once, and a reviewer looks at 18 new images; the palette is borrowed, so it
    is not the company's brand and `ARCHITECTURE.md` says so.
  - *Growth path:* a display font as a token change plus `font-src 'self'`; a brand theme as one more block; a
    design tool's export that writes the tokens file (D-28).

### D-30 — How does a skeleton show three kinds of user without building three products?

`Accepted` 2026-09-12 · needed by plan 09 · build now (thin) · judged by DR-1, DR-2, DR-3, DR-4, FR-4, FR-7, QR-8,
QR-11, QR-12, QR-22

**What we are deciding.** The product serves three audiences (§1): a visitor who has not signed in, a taxpayer,
and the internal team who look at other people's accounts. The skeleton so far shows one of them. A reviewer
cannot see that the zones are real, because nothing walks from one to another, and the guard written into D-18
has never refused anybody. The question is the smallest thing that makes all three real — real enough to walk
through in a browser, and honest enough that nobody mistakes it for a security mechanism.

It is decided now because plan 09 builds the support zone's first page, which is the trigger D-18 named:
"nothing else is built before the support zone's first page".

**Not decided here:**
- the identity provider and the real sign-in flow (D-17: a navigation to the backend);
- what the support team actually needs to do (DR-4 beyond one screen);
- the look (D-29).

| Criterion | A — no session: every screen open, sign-up a dead form | B — the stand-in backend owns the session | C — a flag in browser storage | D — a real identity provider |
|---|---|---|---|---|
| Three flows a person can walk | ❌ the form leads nowhere | ✅ guest → sign up → taxpayer → support → sign out | ⚠️ walks, but proves nothing | ✅ |
| DR-3, D-18 the guard is exercised | ❌ nothing to refuse | ✅ a taxpayer opening the support zone is refused, and the refusal is a test | ⚠️ refuses its own flag | ✅ |
| DR-2, QR-11 no token in the browser | ✅ vacuously | ✅ an httpOnly cookie the page cannot read | ❌ **the lint rule forbids exactly this**, and rightly | ✅ |
| D-17's CSRF header ever proven | ❌ | ✅ the stand-in refuses a mutation without it, as Rails does | ❌ | ✅ |
| QR-8 cost today | ✅ | ⚠️ three paths in the contract, a map of sessions in the stand-in, one zone | ✅ | ❌ no backend exists |
| Honest to a reviewer | ⚠️ the empty form is the dishonest part | ✅ the actor switch is labelled as the stand-in's shortcut | ❌ looks like auth, is not | ✅ |
| Cost of changing later | — | ✅ the real backend replaces the stand-in; the frontend does not move | ⚠️ thrown away | — |

- **Decision:** B. The stand-in backend gains a session, and the frontend gains the three things D-17 and D-18
  designed for and deliberately did not build.
  - *The contract* grows `POST /session`, `GET /me` and `DELETE /session`, a `User`, and `Permission` as an enum
    that generates the union D-18 promised. Everything else follows from the generated types.
  - *The stand-in* keeps sessions in memory, addressed by an opaque id in a cookie that is `HttpOnly`,
    `SameSite=Lax` and `Path=/`. It refuses any non-GET without `X-CSRF-Token`, exactly as D-17 wrote, so the
    transport's header is proven by the first mutation rather than promised.
  - *Sign-up chooses the actor* — taxpayer or support — and the page says in its own words that this is the
    stand-in's shortcut, standing in for the backend's sign-in (D-17). A demo that hides what it is would be worse
    than no demo.
  - *The frontend* gets the session as one typed query, one `can(session, permission)`, and one guard in
    `beforeLoad`: on the app's layout route, and on the support zone's. A taxpayer who opens a support address
    meets the same "no access" screen the API's 403 produces (D-18).
  - *The support zone* is `src/admin/`, with one page: a list of accounts, sorted and paged by the server, drawn
    with the same `ui/Table` the taxpayer's transactions use. Its zone row joins the lint map, whose fixture cases
    for `admin/` were written in plan 03 and have been waiting since.
  - *Three flows, three specs,* in Chromium and WebKit (D-14's amendment), each with axe.
- **Evidence:** read 2026-09-12.
  - D-18's entry sets the trigger, and names what is built with the first support page: the session carries a flat
    list of permissions, `Permission` comes from the contract, one `can()`, one guard in a layout route's
    `beforeLoad`.
  - D-17's entry sets the mechanism: httpOnly cookie, `credentials: 'same-origin'` already in the transport, the
    CSRF header on every non-GET, and the stand-in answering 403 without it.
  - `lint/fixtures/layers/src/admin/` already holds the marked cases for a support zone, from plan 03; the zone
    list in `.oxlintrc.json` is `["app", "public"]` and gains one entry.
  - The route guard's seat exists: `src/routes/_app.tsx` is the layout route, and `sign-in.tsx` already validates
    a return address that must be a path on this site.
  - *Not measured:* what the session adds to the first screen's cost, which plan 10's budget would weigh.
- **Wrong if:**
  - the actor switch is read as a claim about security. Then it is moved behind an obvious stand-in marker, or
    removed and the support zone reached by an address alone;
  - `docker compose up` stops showing data to someone who has not signed in. The guest must still see something
    real, so the transactions page stays reachable in the taxpayer's flow and the guard sends the signed-out
    visitor to the public zone rather than to an empty screen;
  - the support zone grows past one screen inside this take-home. That is DR-4, and it is not this.
- **Where it leads:**
  - *Gains:* the three zones stop being folders and become three journeys a reviewer can walk; D-17 and D-18 stop
    being paper; the guard, the 401 path and the CSRF header each get a test; `ui/Table` is proven reusable by a
    second, unrelated screen.
  - *Costs:* the stand-in holds state, so each flow resets it; the contract grows; one more zone to keep isolated.
  - *Growth path:* the real backend answers the same three paths and nothing in the frontend moves; delegated
    access (an accountant acting for a client) is a different session payload, not a different mechanism; the
    support zone's remaining screens are DR-4.

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

### CC-05 — The generator's pinned version could not be installed, and was not safe · 2026-09-11

- **Assumed:** D-24 pinned `orval` 8.30.0 and counted one advisory, in `js-yaml`, answered by an
  override.
- **Found:** measured during D-03's spike.
  - D-23's quarantine refuses 8.30.0, which is 3.8 days old; the newest version past it is 8.28.1.
  - orval's repository published 10 advisories between 2026-09-06 and 2026-09-10, 7 of them critical,
    all code injection from a hostile contract. They are patched across 8.29.0, 8.30.0 and 8.31.0, so
    8.30.0 still carries two.
  - The global advisory database, which `bun audit` reads, had none of the ten: `check` would have
    passed on a vulnerable version.
  - 8.31.0, one day old and without provenance, fixes all ten, ships `js-yaml` 4.3.2, and carries
    orval #4059, which D-03's check in the transport needs.
- **Changed:**
  - D-24 is amended to 8.31.0, admitted through D-23's exclusion for a reviewed security fix. The
    review runs in plan 04 before the install: the publisher, install scripts, and the commits and files
    between the two tags. If any of it fails, the choice returns to the author.
  - The `js-yaml` override goes.
  - The exclusion is removed at plan 05's update batch, once the version has aged.
- **Lesson:** a pinned version is a measurement with a date. `bun audit` sees only the global database,
  and a project's own advisories reach it days later. A tool whose recent releases are security fixes is
  checked at its source as well.

### CC-06 — A currency's minor digits were assumed to be one fact, the same everywhere · 2026-09-11

- **Assumed:** D-08 took a currency's minor digits from `Intl`, "so there is no currency table". The
  contract said only "the currency's minor unit", without naming whose table. D-08's spike checked EUR 2,
  JPY 0 and KWD 3, where every table agrees.
- **Found:** at plan 04's code review, then measured. There are three tables, and they disagree pairwise:

  | Currency | ISO 4217 | `Intl` (CLDR) | Ruby `money` |
  |---|---|---|---|
  | HUF | 2 | 0 | 0 (`subunit_to_unit` 1) |
  | IDR | 2 | 0 | 2 (100) |
  | IQD | 3 | 0 | 3 (1000) |

  - `Intl` also gives 0 where ISO says 2 for ALL, LAK, LBP, IRR and MGA.
  - A backend on Ruby's `money` sending `{ IDR, minor: 123456 }` (Rp 1,234.56) would show as
    `IDR 123,456`: 100 times too large, and no check fails.
  - With the right unit, `Intl`'s default still rounds: HUF 1234.56 prints `HUF 1,235`, a rounding QR-2
    allows only as a named step.
  - Sources: Node 24.21.0 with ICU 78.3 and CLDR 48; `datasets/currency-codes` `codes-all.csv`, last
    changed 2026-02-01; RubyMoney `config/currency_iso.json` on `main`; all read on 2026-09-11.
- **Changed:**
  - D-08 is amended: the minor digits travel with every fiat amount (`exponent`), as `decimals` does with
    crypto. The frontend holds no currency table.
  - How many digits a screen shows became D-27, deferred by the author as a domain question. Until then
    every digit is shown.
  - The code follows in its own plan, before any screen formats fiat (plan 07).
- **Lesson:** a unit left implicit is a unit two sides can disagree on. Test a lookup on the cases where
  its sources disagree, not only on the ones where they all agree.

### CC-07 — Automatic code splitting was assumed to give each page its own chunk · 2026-09-11

- **Assumed:** D-05 took the router's automatic code splitting to put each route's screen into its own
  chunk. It wrote down one doubt, as its "Wrong if": pages reached through a zone's `index.ts`.
- **Found:** at plan 05's build, the doubt was right.
  - Each route got a chunk of 0.09 kB that only re-exported its page from one shared chunk of 2.08 kB. That
    shared chunk held every page of the app zone.
  - The bundler could not tell that the other re-exports in `app/index.ts` were free of side effects, so it
    kept the whole zone together.
  - Declaring the modules free of side effects, except CSS, fixed it: `"sideEffects": ["**/*.css"]` in
    `package.json`. Each page then had its own chunk of 0.40 to 0.74 kB, and the entry went from 325.27 to
    316.51 kB.
- **Changed:**
  - `package.json` declares `sideEffects`. D-05's "Wrong if" had planned a different response: lazy
    wrappers in the zone's `index.ts`, with automatic splitting switched off. The one line keeps the
    decision as it was.
  - It has a cost. A module imported only for what it does on import (`import './x'`) is now dropped from
    the build without a word. Such a module is listed in `sideEffects`, or its effect is called explicitly
    from `main.tsx`. Plan 08's reporter is the first candidate.
  - Nothing guards the split today. Plan 08's bundle budget should also check that each page stays in its
    own chunk.
- **Lesson:** a barrel is a boundary for people and for lint, but to a bundler it is one module that
  imports everything. Measure the chunks, not the config.

### CC-08 — The quarantine was assumed to cover the packages already installed · 2026-09-11

- *Assumed:* once plan 02 added the 7-day quarantine (D-23), every package in the lockfile was older than 7 days.
- *Found:*
  - While D-07's spike was being installed in a scratch folder, the quarantine refused the versions the project
    itself runs: `react` 19.3.0, `react-dom` 19.3.0 and `vite` 8.3.0.
  - The registry has them published at 2026-09-09 17:21 (`react`), 2026-09-09 17:17 (`react-dom`) and
    2026-09-10 11:30 (`vite`).
  - Plan 01's scaffold resolved them on 2026-09-10. Commit 972e04b ("pin every package exactly and quarantine
    fresh versions", 2026-09-10 19:44) then pinned them without checking their age; `vite` was eight hours old.
  - The quarantine applies only when a version is resolved. A frozen install never asks.
- *Changed:* nothing yet. This is recorded, not fixed in passing.
  - The three versions leave the quarantine by themselves on 2026-09-16 and 2026-09-17.
  - What would close the gap is a check that fails while any locked version is younger than the quarantine,
    unless it is named in `minimumReleaseAgeExcludes` with a reason. That is for the author to decide.
- *Measured again the same day, in plan 05a:*
  - The lockfile held 64 versions younger than the quarantine, not 3. 13 are orval's reviewed exception. The
    other 51 include 19 `@oxlint/*` and 16 `@rolldown/*` binaries.
  - All 51 came in on 2026-09-10 between 16:00 and 16:08, through plan 01's commits. The last of them,
    `vite` 8.3.0, leaves the quarantine on 2026-09-17 at 11:30 UTC.
  - "Assumed" above overstates what was unknown. D-23's evidence had already seen oxlint 1.82.0, then 3 days
    old, pass a frozen install, and concluded that the quarantine guards additions, not reinstalls. What
    nobody measured was how many young versions the lockfile already held.
  - Bun's resolver holds. A lockfile resolved today with the quarantine on held 0 young versions out of 375,
    transitive ones included.
- *Changed in plan 05a, agreed by the author:* a pre-commit gate refuses any version younger than the quarantine
  that a commit adds to `bun.lock` (D-23, amended). The 51 are already locked, so the gate does not see them.
  They are recorded here, and they leave the quarantine by themselves.

### CC-09 — Reading a package's code was assumed to show every style it injects · 2026-09-11

- *Assumed:* D-07's first draft judged the kits against the CSP by searching their published files for
  `createElement('style')`. It concluded that Radix inserts `<style>` and that Base UI and React Aria do not.
- *Found:* the author rejected that draft on other grounds. The browser spike, run under the production CSP, then
  showed two things the search had missed:
  - Base UI renders a `<style>` through JSX, a React 19 hoisted style, which a setting switches off;
  - React Aria inserts one from a hook, in a dependency the search never opened.
- *Changed:* a claim about what code does at runtime is measured at runtime. D-07's CSP row comes from the
  browser, under the Caddyfile's header, counting `securitypolicyviolation` events.

### CC-10 — The router's link and the kit's link were assumed to work together once joined · 2026-09-11

- *Assumed:* plan 06 joined them with TanStack Router's `createLink`, the path its custom-link guide documents
  for React Aria. The component test pressed a link with the mouse only.
- *Found:* the wrap-up drove the app by the keyboard. In all three engines, Enter on any link loaded the page again:
  a marker set on `window` was gone, and one load event fired. The app's state and its query cache went with it.
  React Aria follows a link pressed with Enter by itself. It creates a separate `<a>` and clicks it, and the
  router never sees that click (react-aria 1.21's `openLink`). It uses the app's `navigate` only when given one
  through its `RouterProvider`.
- *Changed:* the root route wraps the routes in `RouterLinkNavigation`. A component spec presses Enter, and checks
  both that the current page moves and that the address stays inside the app. Links and controls are tested by
  the keyboard, as well as by the pointer.

---

# Part III — Delivery

Draft order, finalised as each plan is written. **Cut line:** plans 01–09 are the skeleton; 10 is stretch,
and the documentation in 11 is must. If a timebox is exceeded, the cut is taken from the bottom and recorded
in `ARCHITECTURE.md` § Skipped.

*Re-ordered 2026-09-12, at the author's word.* The look and the shell move ahead of the transactions page, so
that the table is photographed once against the final palette instead of twice; and the three audiences get a
plan of their own (D-30), because the zones were folders nobody could walk between.

| Plan | Slice |
|---|---|
| 01 | Scaffold: app shape, runtime, Docker, TS config, agent tooling (CodeGraph, Playwright MCP) |
| 02 | Gates: lint, format, hooks, commit lint, security tooling, `check` |
| 03 | Boundaries: layers and zones, lint rules proven by deliberate violations |
| 04 | Contract and API layer: contract, codegen, typed transport, amounts, typed mocks, dataset |
| 05 | Routing: shell, routes, typed params, permission guard seam |
| 06 | UI foundation: tokens, primitives, a11y defaults |
| 07 | Look and shell: one theme's tokens (D-29), the sidebar the zones share, a text field, the baselines re-shot |
| 08 | Transactions page: table over 10 000 rows, four states, tests across the trophy |
| 09 | Three audiences (D-30): the stand-in's session, sign-up, the support zone's first screen, and the guest, taxpayer and support journeys walked in the browser |
| 10 | Observability seam with Web Vitals, and a bundle-size budget (stretch). Partial by the author's decision, 2026-09-11: the throttled perf test is skipped on purpose (QR-9), for `ARCHITECTURE.md` § Skipped |
| 11 | `ARCHITECTURE.md` assembled from Part II conclusions (Decision, Where it leads) and the course corrections, README, AI-layer paragraph, final review |

**Skipped so far, on purpose** — the source of `ARCHITECTURE.md` § Skipped, kept as cuts happen:

| What | Why | Where it is recorded | What would bring it back |
|---|---|---|---|
| A try-out of the schema check in the transport (`includeZodSchemaInArguments`) | time; D-03 keeps the check in the adapter | plan 04's log, cut 1 | D-03's growth path |
| Mutation testing (Stryker) | at first, Stryker 10.0.0 pulled `qs` 6.15.1, with three moderate advisories, and `bun audit` failed; then, 2026-09-11, the author deferred it as extra functionality. Deliberate breaks prove every test (QR-23) | plan 04's log, cut 2; D-09's amendment | future work: a Stryker release with the fixed client (stryker-js #6177, open since 2026-08-20), or a try of Stryker 9.6.0, whose client resolves `qs` 6.16 (its fit with Vitest 5 is unmeasured) |
| The throttled browser perf test and its interaction budgets | time, by the author's decision, 2026-09-11 | QR-9, plan 08's row | D-20's growth path |
| How far a container the agent starts can reach | deferred by the author: not what the take-home is about | D-26 | D-26 |
| How many digits a screen shows per currency | deferred by the author: a domain question that needs research | D-27, CC-06 | D-27 |

## Inputs for plan 09 — what the final documents carry

Given by the author 2026-09-12, before plan 07, so they are not lost when the documents are written.

| Input | What it is | Where it lands |
|---|---|---|
| **Raising the floor for a whole team** | The next step after this skeleton is not more code: it is the written rules, recipes and agent skills that make every developer's output safer and more maintainable — the working agreement, the gates, and the review commands, generalised beyond one repository | `ARCHITECTURE.md` § Next, as one of the named directions; judged against D-15 (how far the AI layer goes) and DR-6 (security with agents) |
| **Effort metrics from the session logs** | After delivery, read this project's agent session logs and separate the author's own attention (when messages were written, decisions accepted) from the agents' wall-clock time, and both from waiting. The take-home is sized in the author's hours; an agent's hours are not the same currency. The commit history is scattered because a Claude Pro subscription pauses work in five-hour windows, and because parts of this skeleton are also wanted for the author's own project, which bought it more attention than the brief alone would | a short summary document, with the method stated (which log fields, how a gap is classified) so the numbers are checkable |
| **The author's principles** | 3.1 never drift from the real project — requirements first, taken from the product and its posting; 3.2 evidence everywhere, and the code must actually run — the agent proved each test and gate by a deliberate break; 3.3 keep the documentation and the reasoning behind it, because losing that context is what makes onboarding expensive: a newcomer cannot tell what was deliberate; 3.4 security carries extra weight with AI agents and with npm as it is today; 3.5 alternatives must sometimes be considered away from the project's habits, because a spread of viewpoints is how a project grows; 3.6 trade-off tables are worth the time, but a small proof is worth more — much of this work's agent time went into spikes that confirmed or refuted them; 3.7 technology moves in a spiral and a finished decision suggests a better one, so the backlog comes from talking to engineers, customers and stakeholders and from reading risk, not from a fixed plan | the summary document, and `ARCHITECTURE.md` where a principle explains a decision |
