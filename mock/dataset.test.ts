import { describe, expect, test } from 'vitest'
import { TransactionPage } from '../src/api/generated/model/index.ts'
import { generateTransactions } from './dataset.ts'

const data = generateTransactions(42, 10_000)
const amounts = data.flatMap((t) => (t.kind === 'trade' ? [t.sold, t.bought] : [t.amount]))

describe('the dataset (QR-6)', () => {
  test('is the same for the same seed, and different for another', () => {
    expect(generateTransactions(42, 10_000)).toEqual(data)
    expect(generateTransactions(43, 10_000)).not.toEqual(data)
  })

  test('has the scale and variety the product must handle', () => {
    expect(data).toHaveLength(10_000)
    expect(new Set(data.map((t) => t.kind))).toEqual(new Set(['deposit', 'withdrawal', 'trade']))
    expect(new Set(amounts.map((a) => a.asset)).size).toBeGreaterThanOrEqual(20)
    const decimals = new Set(amounts.map((a) => a.decimals))
    expect(decimals.has(8) && decimals.has(18)).toBe(true)
  })

  test('satisfies the contract, row by row, so the stand-in cannot drift from it', () => {
    const page = TransactionPage.safeParse({ items: data })
    expect(page.success ? [] : page.error.issues.slice(0, 3)).toEqual([])
  })
})
