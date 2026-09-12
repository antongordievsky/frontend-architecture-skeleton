# Architecture

A frontend skeleton for a crypto-tax product: the structure, the boundaries that hold it, the
seams it grows through, and what was deliberately left out.

## 1. Architecture at a glance

```
src/
├── routes/       route shell
├── public/       visitor zone
├── app/          taxpayer zone
├── admin/        support zone
├── components/   shared product components
├── ui/           product-agnostic design system
├── api/          network boundary
└── domain/       framework-free domain types

mock/             stand-in backend, served over HTTP; unreachable from src/
```

Dependencies flow one way:

```
routes → zones → components → ui
                     ↓
                    api → domain
```

- zones cannot import each other
- pages cannot import other pages
- a page, a part and a shared component are all modules: a folder with one `index.ts`, private
  inside
- `ui/` knows nothing about the product
- `api/` is the only network boundary
- `domain/` has no React and no DOM dependencies

## 2. Boundaries are enforced

Architecture is enforced by lint, not by convention (D-16). What is physically refused:

- a zone importing another zone
- a page importing another page, or being reached by a deep path instead of its zone's entry point
- anything but `ui/` importing React Aria
- raw `button`, `input`, `a`, `select`, `textarea` or `dialog` outside `ui/`
- `api/generated` reached from outside `api/`
- a raw colour, or a custom property defined outside `ui/tokens.css`
- a token storage call, or `dangerouslySetInnerHTML`, anywhere

The layer rule is itself tested against 33 known violations, so a rule that stopped matching fails
`check` instead of passing quietly.

## 3. The seams

### API

`contract/openapi.yaml` is the source of truth.

```
OpenAPI → orval → generated client → adapter → domain types → screen
```

Responses are validated at the boundary against the contract's schema, and screens never use
generated types. A drift between the contract and the committed client fails `check`. Money
crosses this seam as integers — base units with the asset's decimals, minor units with their own
exponent — so no amount is ever held in a float (D-03, D-08).

### State

- server state → TanStack Query, keyed by the question asked
- filter and sort state → the URL, validated by the route's search schema
- ephemeral UI state → local React state

Filtering and sorting stay server-side: the first hundred rows sorted by value are not the hundred
largest (D-06).

### Routing

TanStack Router owns typed paths and search parameters, and generates the route tree from the
route files. A route connects a URL to a page exported by a zone, and does nothing else (D-05).

### Design system

`ui/` wraps React Aria and owns interaction behaviour: keyboard, screen reader, touch, the
pointer, and a visible focus ring. Screens consume parts rather than styling interactive
primitives. Every colour and size comes from tokens, so a redesign touches the tokens and the
parts, never the screens (D-07, D-28).

## 4. Representative slice

The transactions page exercises every seam end to end:

```
URL → route search schema → page → TanStack Query → API adapter
    → generated client → stand-in backend over HTTP
```

The response is validated and converted into domain types before it enters the cache. Ten thousand
rows are served in pages of 100 and rendered through virtualisation, with 17 rows mounted at a
time. The sort order lives in the address, so a shared link shows the same rows in the same order.

## 5. Quality gates

`check` runs:

```
format → lint → architecture rules → tokens → contract drift
      → route drift → typecheck → tests → build → secrets → audit
```

It runs on a developer machine or in Docker, on every commit through a hook, and again before a
push. Browser tests cover interaction and visual states in Chromium, WebKit and Firefox, with
screenshot baselines compared at zero tolerance.

Every new test and gate is deliberately broken once before it is adopted, to prove it detects the
failure it claims to (QR-23).

Current numbers: 77 Node tests · 87 browser tests · 10 000 transaction rows · 17 rows mounted at
once.

## 6. Deliberate cuts

This is a foundation, not a production frontend. Not built:

- real authentication and sign-up flows
- the support journey
- a real backend, and any tax logic
- CI/CD
- i18n
- hosting
- a full accessibility pass
- a performance budget

**Known gap.** The transactions page has no page-level regression test. Its parts are covered, but
a regression in how the page composes them could currently pass `check`. That is the first gap to
close.

## 7. Why these choices

Three principles drove the design:

1. **Enforce the boundaries that matter.** If an architectural rule is worth having, `check`
   should be able to fail on it. A boundary nobody can cross beats one everybody agrees with.
2. **Generate at external seams.** The server contract generates the client; hand-written adapters
   keep the rest of the frontend independent of generated code.
3. **Build only what has a consumer.** Authentication, the remaining zones and the infrastructure
   have seams and paragraphs, not speculative implementations.

The full decision record — every option, why each rejected one lost, the evidence, and the
condition that would make a decision wrong — is in
[`docs/requirements-and-analysis.md`](docs/requirements-and-analysis.md). How each slice was
built, and what broke along the way, is in
[`docs/plans/`](docs/plans/00-requirements-and-working-agreement.md).
