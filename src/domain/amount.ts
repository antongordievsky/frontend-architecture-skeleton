// D-08: amounts are plain, read-only data in the smallest unit, with the asset or the currency attached.
// No `number` ever holds an amount: it keeps about 16 significant digits, and ETH has 18 decimals.

export type CryptoAmount<A extends string = string> = {
  readonly kind: 'crypto'
  /** The server's asset id, never a ticker: precision travels with the amount, not with a symbol. */
  readonly asset: A
  readonly decimals: number
  readonly units: bigint
}

export type FiatAmount<C extends string = string> = {
  readonly kind: 'fiat'
  /** ISO 4217. */
  readonly currency: C
  /** Digits of the unit `minor` counts in, as the server sent them: tables disagree (CC-06). */
  readonly exponent: number
  readonly minor: bigint
}

export type Amount = CryptoAmount | FiatAmount

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

// NoInfer: the second argument cannot widen A, so adding two different known assets fails to compile.
// Assets that arrive as data are only `string` to the compiler; for them the runtime check answers.
export const addCrypto = <A extends string>(
  a: CryptoAmount<A>,
  b: CryptoAmount<NoInfer<A>>,
): Result<CryptoAmount<A>, 'asset-mismatch' | 'decimals-mismatch'> => {
  if (a.asset !== b.asset) return { ok: false, error: 'asset-mismatch' }
  if (a.decimals !== b.decimals) return { ok: false, error: 'decimals-mismatch' }
  return { ok: true, value: { ...a, units: a.units + b.units } }
}

/** Whole units as an exact decimal string: `1500000000000000000n` with 18 decimals is `"1.5"`. */
export const toDecimalString = (units: bigint, decimals: number): `${number}` => {
  const negative = units < 0n
  const digits = (negative ? -units : units).toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals)
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '')
  // The one cast: the string is built from digits, a sign and one dot, so it is a numeric literal.
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}` as `${number}`
}

const formats = new Map<string, Intl.NumberFormat>()
const numberFormat = (locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `${locale} ${JSON.stringify(options)}`
  let format = formats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, options)
    formats.set(key, format)
  }
  return format
}

// Formatting belongs to the render boundary. `Intl` receives the exact decimal string, never a
// `Number`, so every digit the amount holds is shown and nothing is rounded on the way.
export const formatAmount = (amount: Amount, locale: string): string => {
  switch (amount.kind) {
    case 'crypto':
      return numberFormat(locale, { maximumFractionDigits: amount.decimals }).format(
        toDecimalString(amount.units, amount.decimals),
      )
    case 'fiat':
      // The amount's own digits, never `Intl`'s table (CC-06), and all of them. The minimum is enough:
      // `Intl` raises the maximum to meet it. Whether a screen shows fewer is D-27, still open.
      return numberFormat(locale, {
        style: 'currency',
        currency: amount.currency,
        minimumFractionDigits: amount.exponent,
      }).format(toDecimalString(amount.minor, amount.exponent))
  }
}
