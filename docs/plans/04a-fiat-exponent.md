# Plan 04a — Fiat amounts carry their exponent

**Status:** in progress — GREEN LIGHT 2026-09-11 · **Timebox:** 20 min of execution

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
