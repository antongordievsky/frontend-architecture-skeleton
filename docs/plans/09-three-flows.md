# Plan 09 — Three audiences: a guest, a taxpayer, and the team who help them

**Status:** draft — awaiting GREEN LIGHT · **Timebox:** 75 min of execution
**Serves:** FR-4, FR-5, FR-7, QR-11, QR-12, QR-17, QR-22, QR-23, DR-1, DR-2, DR-3, DR-4 · **Applies:** D-30,
D-17, D-18, D-16, D-05, D-03, D-04, D-29, D-09, D-14 (amended)

## Why this plan exists

Part I opens with three actors. The code has folders for all three, lint keeps them apart, and until now nobody
could walk from one to another: the public zone holds a single stub, the support zone does not exist, and the
guard designed in D-18 has never refused anybody.

D-18 set the trigger itself — *"nothing else is built before the support zone's first page"*. This plan builds
that page, so the things both auth decisions deliberately left as paper become real: a session, a permission, a
guard, and the CSRF header D-17 specified. Each of them small, each of them tested.

The honesty rule for the whole plan: the stand-in's sign-up is a **shortcut**, and every screen that uses it says
so. The real product signs in through the backend (D-17). A demo that quietly looked like authentication would be
worse than no demo.

## Approach

| Piece | Where | Decision |
|---|---|---|
| The session in the contract | `POST /session` (sign up and in), `GET /me`, `DELETE /session`; a `User`; `Permission` as an enum, which generates the union D-18 promised. `bun run generate`, and the drift gate proves the tree matches | D-30, D-18, QR-5 |
| The stand-in owns it | `mock/handler.ts` keeps sessions in memory, addressed by an opaque id in a cookie that is `HttpOnly`, `SameSite=Lax`, `Path=/`. It refuses any non-GET without `X-CSRF-Token` with 403, exactly as Rails does, so the header is proven rather than promised. The accounts it lists are seeded from the same generator as the transactions (`MOCK_SEED`), so the support screen is reproducible too | D-30, D-17, D-04 |
| The transport carries the header | `src/api/transport.ts` adds `X-CSRF-Token` to every non-GET from the value `/me` returned, held in memory only — never in storage, which lint refuses anyway | D-17, QR-11 |
| The session as one query | `src/api/session.ts`: `meQuery`, `signUp`, `signOut`, and `can(session, permission)` — a plain function, no package, usable from React Native (DR-8) | D-18, D-03 |
| The guard | one `beforeLoad`: on `_app` it sends a visitor with no session to sign-in with the address to return to (the path D-17 amended in plan 05, now exercised); on the support zone's layout it refuses a taxpayer with the same "no access" screen the API's 403 produces | D-18, D-05 |
| The guest's screens | `src/public/pages/SignUp/` — a form on `ui/TextField` (plan 07): email, display name, and the actor to sign in as, with the shortcut named on the page. `SignInPage` gains the link to it and keeps D-17's explanation | D-30, D-17, FR-5 |
| The support zone | `src/admin/` with one page: accounts, sorted and paged by the server, drawn with the same `ui/Table` the taxpayer's transactions use — which is how we learn whether that part is reusable. Its zone row joins `.oxlintrc.json`; the fixture cases under `lint/fixtures/layers/src/admin/` were written in plan 03 and have been waiting since | D-30, D-16, DR-4 |
| One shell, two sets of items | `components/SideNav` (plan 07) takes the taxpayer's items in `app/AppLayout` and the team's in `admin/AdminLayout`. Zones stay isolated; nothing is duplicated | D-16, D-29 |
| Three flows in the browser | `playwright/flows/guest.spec.ts`, `taxpayer.spec.ts`, `support.spec.ts` against `web-prod`, in Chromium and WebKit, each with axe. Each resets the stand-in's sessions first, so one flow cannot pass because another left a session behind | D-30, D-09, D-14, QR-12 |

**Packages:** none beyond plan 08's axe.

## Steps

1. **Docs.** This plan.
   - Commit: `docs(plans): add plan 09, the three audiences`.
2. **The contract.** The three paths, `User`, `Permission`; then `bun run generate` in its own commit (QR-20).
   - Commits: `feat(contract): a session, a user and the permissions they hold`;
     `feat(contract): regenerate the client`.
3. **The stand-in.** Sessions in memory, the cookie, the CSRF refusal, the seeded accounts, with tests in
   `mock/handler.test.ts`.
   - Commit: `feat(mock): the stand-in keeps a session and refuses a mutation without its token (D-30)`.
4. **The transport and the session adapter.** The header; `meQuery`, `signUp`, `signOut`, `can()`, with tests.
   - Commit: `feat(api): the session as a typed query, and one can() (D-18)`.
5. **The guard.** `beforeLoad` on the app's layout and on the support zone's, with the router tests.
   - Commit: `feat(app): one guard, on the layout routes (D-18)`.
6. **The guest's screens.** `SignUpPage` on `ui/TextField`, the shortcut named; `SignInPage` linked to it.
   - Commit: `feat(public): sign up, with the stand-in's shortcut named on the page (D-30)`.
7. **The support zone.** `src/admin/` with the accounts page, its zone row in lint, its items in `SideNav`.
   - Commit: `feat(admin): the support zone's first screen, on the same Table (DR-4)`.
8. **Three flows.** The specs, in two engines, each with axe.
   - Commit: `test(flows): a guest, a taxpayer and the support team, walked end to end (QR-12)`.
9. **Wrap-up**, below. Then `CLAUDE.md` (the recipe for adding a zone) and this plan's log.
   - Commit: `docs: record plan 09`.

## Proof — each new test and gate seen failing (QR-23)

| Test or gate | Deliberate break | Expected |
|---|---|---|
| the guard actually refuses | remove `beforeLoad` from the support zone's layout | the taxpayer flow reaches the accounts page instead of the "no access" screen, and its spec fails |
| the guard is a shortcut, not the enforcer | let the guard pass but have the stand-in answer 403 | the screen still shows "no access": the spec passes, proving the server is what decides |
| the cookie cannot be read by a script | drop `HttpOnly` from the stand-in's cookie | the spec asserting `document.cookie` holds no session fails |
| the CSRF header is really required | stop sending `X-CSRF-Token` in the transport | signing out answers 403 and the flow fails at that step |
| a lost session returns to sign-in | expire the session on the server between two requests | the app clears the cache and lands on sign-in with the address to return to; the spec fails if it does not |
| flows do not lean on each other | run the support flow without its reset | it fails, because no session exists — which is why the reset is there |
| the form's errors are announced | submit with an empty email after removing the field's error wiring | the spec asking the input for its accessible description fails |
| the accounts list is the server's answer | sort the loaded page in the screen | the spec comparing the first row with the seeded set's extreme fails (the same break as plan 08, one mechanism) |
| zones stay apart | import `@/admin` from `src/app` | lint fails with D-16's message |
| axe on each flow | plant a control without a name in the shell | all three flows fail, from one cause |

## Verification

- The full `check`, on the host and in Docker.
- `docker compose run --rm browser`: gallery in three engines, pages and flows in two, twice with nothing
  changed.
- `docker compose up` from a clean clone: a visitor lands somewhere real, signs up, sees transactions.
- Playwright MCP: walk all three flows by keyboard alone, checking focus order across the sidebar and the page.
- `/code-review` **and `/security-review`** — this is the plan the criterion was written for: a session, a
  cookie, a CSRF header, a guard and a new zone.

## Out of scope

Real authentication of any kind (D-17: the backend's); passwords; anything the support team does beyond looking
at a list (DR-4); delegated access; the dashboard's and settings' content; performance budgets (plan 10).

## Timebox

75 minutes. The cut order, from the bottom:
1. axe on the guest flow (the other two keep it);
2. the support flow's second engine;
3. the accounts page's server-side sorting — the list becomes the first page only, and D-06's rule is recorded
   as unexercised on that screen;
4. the support zone entirely, which leaves DR-4 where it was and costs the plan its third flow.

Steps 2 to 6 cannot be cut: they are the session, and without it neither of the other flows is real.
