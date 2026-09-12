# Frontend foundation — an architectural skeleton

An architectural skeleton for a crypto-tax frontend: the structure, the boundaries, the seams (API, state,
routing, design system) and the tooling that keeps them true. Built as a take-home; the assignment it
answers is quoted at the end.

- **Architecture, one page:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **The long version** — every decision with its options, evidence and "wrong if":
  [`docs/requirements-and-analysis.md`](docs/requirements-and-analysis.md)
- **How the work went**, plan by plan, including what broke: [`docs/plans/`](docs/plans/)

## Run it

Docker is the only requirement. No host runtime, no `.env` step.

```sh
docker compose up            # http://localhost:5173
```

That starts three containers: dependencies are installed once, the stand-in backend serves `/api`, and the
dev server proxies to it. Open http://localhost:5173/transactions for the screen with ten thousand rows.

```sh
docker compose --profile prod up      # http://localhost:8080 — the production build behind Caddy
docker compose run --rm check         # the full check: format, lint, types, tests, build, secrets, audit
docker compose run --rm browser       # component tests and screenshots, Chromium + WebKit + Firefox
```

`WEB_PORT` and `PROD_PORT` override the ports. `MOCK_COUNT`, `MOCK_LATENCY_MS` and `MOCK_FAIL_STATUS`
change what the stand-in does, so the loading and failure states can be seen without touching code:

```sh
MOCK_LATENCY_MS=1500 docker compose up      # watch the loading state
MOCK_FAIL_STATUS=503 docker compose up      # watch the error state and its retry
```

## On the host

Runtimes are pinned in `mise.toml` (`mise install`), and every command goes through `mise exec --`:

| What | Command |
|---|---|
| Full check | `mise exec -- bun run check` |
| Tests · types · lint · format | `bun run test` · `bun run typecheck` · `bun run lint` · `bun run format` |
| Regenerate the API client after a contract change | `mise exec -- bun run generate` |
| Regenerate the route tree | `mise exec -- bun run routes` |
| Production headers and cache rules (with `web-prod` up) | `sh scripts/check-headers.sh` |

## Adding things

Each recipe is short by design — the structure is meant to be extended live, in an interview:

- **A page:** `src/<zone>/pages/<Name>/` with `index.ts` and `<Name>Page.tsx` → export it from the zone's
  `index.ts` → a route file in `src/routes/` → `bun run routes` → `check`.
- **A design-system part:** `src/ui/<Name>/` with the component, its `.module.css` (tokens only), its
  class declarations, `index.ts`, a story per state and a spec → `docker compose run --rm browser
  --update-snapshots` → look at every new image → `check`.
- **A server resource:** add it to `contract/openapi.yaml` → `bun run generate` → an adapter in `src/api/`
  that checks the response and returns domain types.

An import that crosses a boundary fails `lint` with a message naming the rule. A colour written outside
`src/ui/tokens.css` fails `check`. That is the point: the boundaries are tools, not agreements.

## The AI layer, and why it is small

Reviewers of an earlier take-home called a production-scale AI setup over-engineering on a small project,
and that was fair. What is here has a consumer and nothing more: two MCP servers pinned in `.mcp.json` (a
structural code index, and a browser the agent drives to check focus, cursor and roles), a `/staff` command
that produces the decision entries in Part II, and permission rules in `.claude/settings.json` that stop
the agent reading `.env*` or credential files and make every package command ask first. The built-in
`/code-review` and `/security-review` run at each plan's wrap-up instead of custom agents. Everything the
agent may and may not do is written in [`CLAUDE.md`](CLAUDE.md).

---

## The assignment

> Build the architectural skeleton of a brand-new frontend for a crypto tax product: project structure,
> dependency boundaries, an API layer over a mocked backend, representative routing, a design-system
> foundation, quality tooling, one thin example page, and a one-page `ARCHITECTURE.md` explaining the
> reasoning. TypeScript; `docker compose up` must be the only command needed. Roughly three to four hours,
> cut deliberately and say what was cut.
>
> Evaluated on: clarity of structure, whether boundaries are real or just folder names, sound choices at
> the seams, pragmatism over over-engineering, and the quality of the reasoning in the write-up.
