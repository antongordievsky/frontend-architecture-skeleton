import type { CryptoAmount, FiatAmount } from './amount.ts'

// QR-1: one union, discriminated by `kind`, so every switch over it is checked for exhaustiveness.
// `occurredAt` stays the server's ISO 8601 string. A `Date` is a class instance, which the query cache
// cannot compare, and time zones are a formatting concern (§9, tax-year boundaries).
type Common = {
  readonly id: string
  readonly occurredAt: string
  /** Fiat value at the time of the transaction, as the server valued it. */
  readonly value: FiatAmount
}

export type Transaction =
  | (Common & { readonly kind: 'deposit'; readonly amount: CryptoAmount })
  | (Common & { readonly kind: 'withdrawal'; readonly amount: CryptoAmount })
  | (Common & {
      readonly kind: 'trade'
      readonly sold: CryptoAmount
      readonly bought: CryptoAmount
    })

export type TransactionKind = Transaction['kind']
