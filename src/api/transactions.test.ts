import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { asFetch, createHandler } from '../../mock/handler.ts'
import { transactionsInfiniteQuery, transactionsQuery } from './transactions.ts'
import { ApiError } from './transport.ts'

// Integration (D-09): the real adapter, transport and query client, over the stand-in (D-04).
test('reads the first page of the seeded dataset as domain transactions', async () => {
  vi.stubGlobal('fetch', asFetch(createHandler()))
  const page = await new QueryClient().fetchQuery(transactionsQuery())
  expect(page.items).toHaveLength(50)
  expect(page.nextCursor).toBe('50')
  const first = page.items[0]
  expect(typeof (first?.kind === 'trade' ? first.sold.units : first?.amount.units)).toBe('bigint')
})

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
  value: { currency: 'EUR', exponent: 2, minor: '312345' },
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
          value: { kind: 'fiat', currency: 'EUR', exponent: 2, minor: 312_345n },
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

  test('refuses a fiat amount without its exponent: its unit would be a guess (CC-06)', async () => {
    respond({ items: [{ ...deposit, value: { currency: 'EUR', minor: '312345' } }] })
    await expect(fetchPage()).rejects.toMatchObject({ problem: { kind: 'contract' } })
  })

  test('keys the cache by the generated key, with the parameters', () => {
    expect(transactionsQuery({ kind: 'trade' }).queryKey).toEqual([
      '/transactions',
      { kind: 'trade' },
    ])
  })
})

describe('transactionsInfiniteQuery', () => {
  const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

  test('appends the next page to the rows in hand, and stops at the end', async () => {
    vi.stubGlobal('fetch', asFetch(createHandler({ count: 250 })))
    const queryClient = client()
    const options = transactionsInfiniteQuery()
    const first = await queryClient.fetchInfiniteQuery(options)
    expect(first.pages[0]?.items).toHaveLength(100)

    const two = await queryClient.fetchInfiniteQuery({ ...options, pages: 2 })
    expect(two.pages.flatMap((p) => p.items)).toHaveLength(200)
    // The ids are the set's, in order, with nothing repeated across the seam between pages.
    const ids = two.pages.flatMap((p) => p.items.map((t) => t.id))
    expect(new Set(ids).size).toBe(200)

    const all = await queryClient.fetchInfiniteQuery({ ...options, pages: 5 })
    expect(all.pages.flatMap((p) => p.items)).toHaveLength(250)
    expect(all.pages.at(-1)?.nextCursor).toBeUndefined()
  })

  test('a different order is a different question: its own cache entry', () => {
    const newest = transactionsInfiniteQuery({ sort: 'occurredAt:desc' }).queryKey
    const largest = transactionsInfiniteQuery({ sort: 'value:desc' }).queryKey
    expect(newest).not.toEqual(largest)
    expect(newest).toEqual(['/transactions', { sort: 'occurredAt:desc', limit: 100 }])
  })

  test('asks the server for the order, rather than sorting the rows in hand', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      urls.push(url)
      return asFetch(createHandler({ count: 120 }))(url, init)
    })
    await client().fetchInfiniteQuery(transactionsInfiniteQuery({ sort: 'value:desc' }))
    expect(urls[0]).toContain('sort=value%3Adesc')
    expect(urls[0]).toContain('limit=100')
  })

  // A cancelled page is not a failure of the adapter: the transport passes the abort through untouched
  // (transport.ts), and the query library turns it into its own CancelledError rather than an ApiError.
  // Measured, after expecting AbortError here and being wrong: the abort reaching the server as an
  // AbortError is mock/handler.test.ts's assertion, and this one is about what the cache does with it.
  test('a cancelled page fails as a cancellation, never as an API error', async () => {
    vi.stubGlobal('fetch', asFetch(createHandler({ count: 10, latencyMs: 1_000 })))
    const queryClient = client()
    const pending = queryClient.fetchInfiniteQuery(transactionsInfiniteQuery())
    queryClient.cancelQueries({ queryKey: transactionsInfiniteQuery().queryKey })
    const error = await pending.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(ApiError)
    // `name` stays 'Error': the library does not set it, and only the message names the class. Measured
    // here after asserting `name` and being wrong — the shape of an error is read, not recalled.
    expect((error as Error).message).toBe('CancelledError')
    // And nothing was cached under that key: a cancelled question has no answer.
    expect(queryClient.getQueryData(transactionsInfiniteQuery().queryKey)).toBeUndefined()
  })
})
