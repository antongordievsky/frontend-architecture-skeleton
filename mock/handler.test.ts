import { describe, expect, test } from 'vitest'
import { TransactionPage } from '../src/api/generated/model/index.ts'
import { asFetch, createHandler } from './handler.ts'

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
