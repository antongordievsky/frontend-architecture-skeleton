# Plan 04a — Fiat amounts carry their exponent

**Status:** done 2026-09-11 — GREEN LIGHT 2026-09-11 · **Timebox:** 20 min of execution

## Context

Plan 04's code review found that a fiat amount took its minor digits from `Intl`. Three currency tables
disagree: ISO 4217, `Intl`'s CLDR and Ruby's `money` (CC-06). So `{ IDR, minor: 123456 }` from a backend
on Ruby's `money` would show 100 times too large, and no check would fail. The author amended D-08: the
digits travel with every fiat amount, as `decimals` does with crypto.

This plan puts the amendment into code, before any screen formats fiat (plan 07). How many digits a screen
shows stays open (D-27); until then every digit of the unit is shown.

Serves: D-08 (amended), CC-06, QR-1, QR-2, QR-5, FR-3.

## Approach

- **The contract.** `FiatAmount` gains a required `exponent`, an integer from 0 to 4. Both tables top out
  at 4: ISO 4217 with CLF and UYW, Ruby's `money` with CLF (measured 2026-09-11). A missing or larger
  value is a contract error, raised loudly.
- **The domain.** `FiatAmount` carries `exponent`. `formatAmount` takes its digits from it, with the
  minimum and maximum fraction digits both set to it: every digit is shown and nothing is rounded. There is
  no table, neither `Intl`'s nor our own.
- **The adapter and the stand-in.** The adapter maps the field; the stand-in sends EUR with exponent 2.

## Steps

1. The contract, the regenerated client, and the two fixtures the new required field touches (the
   dataset, and the adapter test's wire deposit). Plus a test that a fiat amount without its exponent is
   a contract error.
   - This is one commit. The drift gate refuses the contract without its generated output, and a dataset
     without the field fails the contract test, so the generated output cannot land alone.
2. The domain type and `formatAmount`, the adapter's mapping, and their tests:
   - HUF with exponent 2, and with 0, as a backend on Ruby's `money` would send it;
   - IDR;
   - every digit shown: EUR `1,234.50`, KWD `0.001`.
3. Wrap-up as usual.

## Verification

- Each new test is seen failing:
  - `formatAmount` back on `Intl`'s digits — HUF prints `123,456`;
  - `exponent` not required in the contract — the missing-exponent test lets a bad amount through;
  - the dataset without `exponent` — the conformance test fails.
- The full `check`, then `/code-review` and `/security-review` on the plan's diff.

## Out of scope

- How many digits a screen shows (D-27).
- A currency whose minor unit is not a power of ten. Ruby's `money` counts MRU in fifths
  (`subunit_to_unit` 5), which an exponent cannot say. Such a backend sends MRU in ISO's 2 digits, or the
  contract grows. Recorded here, not solved.
- Fiat arithmetic: there is no `addFiat` yet. When it arrives, it checks the exponent as `addCrypto`
  checks decimals.

## Timebox

20 minutes. There is nothing to cut: each step is needed for the next. If it runs over, stop and report.

## What happened

Executed 2026-09-11 on `build/04a-fiat-exponent`, from 14:03 to 14:11 by the hooks' timestamps, inside the
timebox; nothing was cut. Three commits:
- `f5f56c4` the plan;
- `948cb88` the contract, its generated output (`mise exec -- bun run generate`, orval 8.31.0) and the
  two fixtures;
- `19feea7` the domain, the adapter and their tests.

**Deviations and surprises**

- *The contract's descriptions become runtime strings.* orval turns each OpenAPI `description` into
  `zod.describe(...)`.
  - They are not in the bundle yet: there are 0 copies at `19feea7`, because nothing outside `src/api`
    imports the api layer. They will ship once a screen imports the adapter.
  - The exponent's measurement note moved out of the contract and into this plan. The object's
    description stays, as the other schemas' do.
  - Whether generated schemas should drop their descriptions is noted for plan 08's bundle budget.
- *Generated output and hand edits share a commit,* as step 1 foresaw: the drift gate and the contract
  test refuse them apart.
- *`maximumFractionDigits` removed.* The plan set both limits. A proof showed the maximum changes nothing:
  `Intl` raises the maximum to meet the minimum, and the decimal string never has more digits than the
  exponent. A line no test can tell apart was removed rather than kept untested.
- *Two planned cases would have caught nothing,* so they were replaced before they were trusted. For EUR
  `1,234.50` and KWD `0.001`, `Intl`'s own defaults already equal the exponent, so both pass with or without
  the fix. HUF `1,234.50` and IQD `0.001` replace them: `Intl`'s default for both is 0 digits, so they fail
  when a digit is dropped.

**Proof (QR-23)** — every row seen failing, then restored:

| Test | Break | Seen |
|---|---|---|
| the dataset satisfies the contract | `exponent` removed from the dataset | "expected [ …(3) ] to deeply equal []" (`"expected": "number"`), and TS2322 in `mock/dataset.ts` |
| a fiat amount without its exponent is a contract error | `exponent` dropped from the contract's `required`, then regenerated | "promise resolved … instead of rejecting" |
| digits from the amount, not a table (CC-06) | HEAD's `formatAmount`, with digits from `Intl` | "expected 'HUF 123,456' to be 'HUF 1,234.56'" |
| every digit shown, nothing rounded | `minimumFractionDigits` removed | "expected 'HUF 1,235' to be 'HUF 1,234.50'" |
| the adapter maps the exponent | the mapping removed | TS2741 "Property 'exponent' is missing", and the adapter test fails |

**Verification**

- The full `check` passed at `19feea7`, through pre-commit:
  - the fixture's 26 expected violations and nothing else;
  - the contract matches;
  - 40 tests;
  - the build;
  - no leaks;
  - `bun audit` clean at 373 packages.
- The bundle contains none of the stand-in's strings (`usdt-tron`, `generateTransactions`,
  `Injected failure`, `Invalid cursor`): 0 files.
- Out of scope, as the plan says: D-27, MRU's fifths, and fiat arithmetic.

**Reviews at wrap-up**

- `/security-review` — no finding met its bar. It checked three things:
  - `exponent` is validated as an integer from 0 to 4 before use, so the server cannot hand `Intl` a value
    outside its range;
  - `BigInt` still receives only patterned strings;
  - no package changed.
- `/code-review` — two findings, both low.
  1. *This log said the contract's descriptions ship in the bundle.* They do not yet. At `19feea7` the
     built bundle holds 0 copies of the description, of `exponent` and of `TransactionPage`, because
     nothing outside `src/api` imports the api layer, so it is tree-shaken away. Measured again, and the
     bullet above is corrected.
  2. *The domain's `exponent` is an unbounded `number`.* The reviewer measured that `fiat('EUR', -1, 5n)`
     makes `Intl` throw a `RangeError`. Recorded, not changed:
     - the adapter is the only source, and the contract's integer from 0 to 4 guards it;
     - crypto's `decimals` has the same shape;
     - a branded type for both is the growth path, when a second source of amounts appears.
  - Checked and fine:
    - the generated schema, in all five schemas that embed it;
    - TS2741 when the adapter drops the field;
    - no other code builds a `FiatAmount`;
    - `formatAmount` with the minimum only, measured on ten cases. CLF shows 4 digits, EUR with exponent 0
      prints `€1,235`, and JPY with exponent 2 prints `¥1,234.00`, as intended while D-27 is open.
      Negative amounts, zero and a 24-digit `minor` also came out right;
    - the old wording survives only where history is kept.
