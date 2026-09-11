import { describe, expect, test } from 'vitest'
import {
  addCrypto,
  type CryptoAmount,
  type FiatAmount,
  formatAmount,
  toDecimalString,
} from './amount.ts'

const eth = (units: bigint): CryptoAmount<'eth'> => ({
  kind: 'crypto',
  asset: 'eth',
  decimals: 18,
  units,
})
const fromServer = (asset: string, decimals: number, units: bigint): CryptoAmount => ({
  kind: 'crypto',
  asset,
  decimals,
  units,
})
const fiat = (currency: string, exponent: number, minor: bigint): FiatAmount => ({
  kind: 'fiat',
  currency,
  exponent,
  minor,
})
// Intl separates a currency code from the number with a no-break space.
const plain = (text: string) => text.replaceAll('\u00a0', ' ')

describe('addCrypto', () => {
  test('adds two amounts of the same asset', () => {
    expect(addCrypto(eth(1n), eth(2n))).toEqual({ ok: true, value: eth(3n) })
  })

  test('refuses two assets that arrive as data', () => {
    expect(addCrypto(fromServer('eth', 18, 1n), fromServer('btc', 8, 1n))).toEqual({
      ok: false,
      error: 'asset-mismatch',
    })
  })

  test('refuses one asset with two precisions', () => {
    expect(addCrypto(fromServer('eth', 18, 1n), fromServer('eth', 9, 1n))).toEqual({
      ok: false,
      error: 'decimals-mismatch',
    })
  })
})

describe('toDecimalString', () => {
  test('keeps all 18 decimals', () => {
    expect(toDecimalString(1_123_456_789_012_345_678n, 18)).toBe('1.123456789012345678')
  })

  test('writes negative, tiny and zero amounts', () => {
    expect(toDecimalString(-5n, 18)).toBe('-0.000000000000000005')
    expect(toDecimalString(1n, 8)).toBe('0.00000001')
    expect(toDecimalString(0n, 18)).toBe('0')
  })

  test('drops a fraction of zeros, and handles an asset without decimals', () => {
    expect(toDecimalString(200_000_000n, 8)).toBe('2')
    expect(toDecimalString(1234n, 0)).toBe('1234')
  })
})

describe('formatAmount', () => {
  test('shows every digit of an 18-decimal amount', () => {
    expect(formatAmount(fromServer('eth', 18, 1_234_567_123_456_789_012_345_678n), 'en-US')).toBe(
      '1,234,567.123456789012345678',
    )
  })

  test('takes fiat digits from the amount, never from a currency table (CC-06)', () => {
    // Intl gives HUF and IDR 0 digits; ISO 4217 gives both 2; Ruby's money gives HUF 0 and IDR 2.
    expect(plain(formatAmount(fiat('HUF', 2, 123_456n), 'en-US'))).toBe('HUF 1,234.56')
    expect(plain(formatAmount(fiat('HUF', 0, 1235n), 'en-US'))).toBe('HUF 1,235')
    expect(plain(formatAmount(fiat('IDR', 2, 123_456n), 'en-US'))).toBe('IDR 1,234.56')
  })

  test('shows every digit of the unit and rounds nothing, while D-27 is open', () => {
    expect(plain(formatAmount(fiat('HUF', 2, 123_450n), 'en-US'))).toBe('HUF 1,234.50')
    expect(plain(formatAmount(fiat('IQD', 3, 1n), 'en-US'))).toBe('IQD 0.001')
  })

  test('formats fiat in the locale, with the digits the amount carries', () => {
    expect(formatAmount(fiat('EUR', 2, 123_456n), 'de-DE')).toBe('1.234,56 €')
    expect(formatAmount(fiat('JPY', 0, 1234n), 'en-US')).toBe('¥1,234')
  })
})
