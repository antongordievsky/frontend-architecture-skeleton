// QR-1: amounts that must not mix fail to compile. Each `@ts-expect-error` below must be needed, or `tsc`
// fails with TS2578, so this file is a test that `typecheck` runs, with no test runner.
import { addCrypto, type CryptoAmount, type FiatAmount } from './amount.ts'

declare const eth: CryptoAmount<'eth'>
declare const moreEth: CryptoAmount<'eth'>
declare const btc: CryptoAmount<'btc'>
declare const eur: FiatAmount<'EUR'>
declare const fromServer: CryptoAmount
declare const alsoFromServer: CryptoAmount

export const sameAsset = addCrypto(eth, moreEth)

// @ts-expect-error two different known assets
export const twoAssets = addCrypto(eth, btc)

// @ts-expect-error an asset amount and a fiat amount
export const assetAndFiat = addCrypto(eth, eur)

// Assets that arrive as data are only `string` to the compiler: this compiles, and the runtime answers.
export const fromData = addCrypto(fromServer, alsoFromServer)

// Each case stays on one line: a directive covers only the line below it, and the formatter wraps long ones.
// @ts-expect-error a fractional number is not an amount
export const fractional: CryptoAmount<'eth'> = { ...eth, units: 1.5 }

export const mutate = () => {
  // @ts-expect-error amounts are read-only
  eth.units = moreEth.units
}
