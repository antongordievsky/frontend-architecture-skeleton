import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { transactionsQuery } from './transactions.ts'
import { ApiError } from './transport.ts'

const respond = (body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body)),
  )

const deposit = {
  kind: 'deposit',
  id: 'tx-1',
  occurredAt: '2026-09-11T10:00:00Z',
  amount: { asset: 'eth', decimals: 18, baseUnits: '1123456789012345678' },
  value: { currency: 'EUR', minor: '312345' },
}

const fetchPage = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } }).fetchQuery(transactionsQuery())

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transactionsQuery', () => {
  test('turns the server page into domain transactions, with exact integer amounts', async () => {
    respond({ items: [deposit], nextCursor: '50' })
    await expect(fetchPage()).resolves.toEqual({
      items: [
        {
          kind: 'deposit',
          id: 'tx-1',
          occurredAt: '2026-09-11T10:00:00Z',
          amount: { kind: 'crypto', asset: 'eth', decimals: 18, units: 1_123_456_789_012_345_678n },
          value: { kind: 'fiat', currency: 'EUR', minor: 312_345n },
        },
      ],
      nextCursor: '50',
    })
  })

  test('refuses an amount in the wrong shape as a contract error, never as a number', async () => {
    respond({ items: [{ ...deposit, amount: { ...deposit.amount, baseUnits: 1.5 } }] })
    const error = await fetchPage().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ problem: { kind: 'contract' } })
  })

  test('keys the cache by the generated key, with the parameters', () => {
    expect(transactionsQuery({ kind: 'trade' }).queryKey).toEqual([
      '/transactions',
      { kind: 'trade' },
    ])
  })
})
