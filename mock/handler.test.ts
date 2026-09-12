import { describe, expect, test } from 'vitest'
import { type Transaction, TransactionPage } from '../src/api/generated/model/index.ts'
import { generateTransactions } from './dataset.ts'
import { asFetch, createHandler, sortedFor } from './handler.ts'

const handler = createHandler({ seed: 42, count: 10_000 })
const get = (path: string) => handler(new Request(`http://localhost${path}`))

describe('the stand-in handler', () => {
  test('pages through every transaction with the cursor', async () => {
    let cursor: string | undefined
    let rows = 0
    do {
      const response = await get(`/api/transactions${cursor ? `?cursor=${cursor}` : ''}`)
      const page = TransactionPage.parse(await response.json())
      rows += page.items.length
      cursor = page.nextCursor
    } while (cursor)
    expect(rows).toBe(10_000)
  })

  test('filters by kind', async () => {
    const page = TransactionPage.parse(await (await get('/api/transactions?kind=trade')).json())
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((t) => t.kind === 'trade')).toBe(true)
  })

  // D-06: the server orders the whole set. These read the seeded dataset directly to know the answer
  // independently of the handler — a test that asked the handler for both would agree with itself.
  const all = generateTransactions(42, 10_000)

  test('orders the whole set by value, not the page in hand', async () => {
    const page = TransactionPage.parse(
      await (await get('/api/transactions?sort=value%3Adesc&limit=1')).json(),
    )
    const largest = all.reduce((a, b) => (BigInt(b.value.minor) > BigInt(a.value.minor) ? b : a))
    expect(page.items[0]?.value.minor).toBe(largest.value.minor)
  })

  test('the default order is newest first', async () => {
    const page = TransactionPage.parse(await (await get('/api/transactions?limit=2')).json())
    const [first, second] = page.items
    expect(first?.occurredAt).toBe(all[0]?.occurredAt)
    expect(first && second && first.occurredAt > second.occurredAt).toBe(true)
  })

  test('a sort the enum does not name is refused', async () => {
    const response = await get('/api/transactions?sort=value%3Asideways')
    expect(response.status).toBe(400)
  })

  // A cursor walking a non-unique key repeats one row and skips another, and each page still looks well
  // formed on its own. Only walking the whole set shows it.
  test.each(['occurredAt:desc', 'occurredAt:asc', 'value:desc', 'value:asc'])(
    'paging %s sees every transaction exactly once',
    async (sort) => {
      const seen = new Set<string>()
      let cursor: string | undefined
      do {
        const query = `sort=${encodeURIComponent(sort)}&limit=200${cursor ? `&cursor=${cursor}` : ''}`
        const page = TransactionPage.parse(await (await get(`/api/transactions?${query}`)).json())
        for (const item of page.items) seen.add(item.id)
        cursor = page.nextCursor
      } while (cursor)
      expect(seen.size).toBe(10_000)
    },
  )

  // The tiebreaker's own test. Paging the seeded set cannot show it: Array.prototype.sort is stable, so
  // equal rows keep their input order and every request agrees with itself. A real server has no such
  // promise — equal rows arrive in whatever order the database chose — so the order must not depend on the
  // input order. Feeding the same rows twice, shuffled, is how that is checked (QR-23).
  test('rows of equal value come back in one order, whatever order they arrive in', () => {
    const row = all[0]
    if (!row) throw new Error('the seeded dataset is empty')
    // One value, three ids: the comparison has nothing to go on but the tiebreaker.
    const equal = ['tx-ZZZZZ', 'tx-AAAAA', 'tx-MMMMM'].map((id) => ({ ...row, id }))
    const ids = (rows: readonly Transaction[]) => sortedFor(rows, 'value:desc').map((t) => t.id)
    const expected = ['tx-AAAAA', 'tx-MMMMM', 'tx-ZZZZZ']
    expect(ids(equal)).toEqual(expected)
    expect(ids([...equal].reverse())).toEqual(expected)
  })

  test('a new sort is a new question: page one changes with it', async () => {
    const newest = TransactionPage.parse(await (await get('/api/transactions?limit=1')).json())
    const cheapest = TransactionPage.parse(
      await (await get('/api/transactions?sort=value%3Aasc&limit=1')).json(),
    )
    expect(newest.items[0]?.id).not.toBe(cheapest.items[0]?.id)
  })

  test.each([
    'limit=0',
    'limit=-5',
    'limit=201',
    'limit=1.5',
    'limit=abc',
    'cursor=abc',
    'cursor=-1',
    'kind=staking',
  ])('refuses a query the contract forbids: %s', async (query) => {
    const response = await get(`/api/transactions?${query}`)
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toBe('application/problem+json')
  })

  test('answers what it does not know with a Problem', async () => {
    const response = await get('/api/unknown')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe('application/problem+json')
  })

  test('injects a failure on request', async () => {
    const failing = createHandler({ count: 1, failStatus: 503 })
    const response = await failing(new Request('http://localhost/api/transactions'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ title: 'Injected failure', status: 503 })
  })

  test('honours the caller abort while it waits', async () => {
    const slow = asFetch(createHandler({ count: 1, latencyMs: 1_000 }))
    const controller = new AbortController()
    const request = slow('/api/transactions', { signal: controller.signal })
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
