import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError, transport } from './transport.ts'

const json = (body: unknown, status = 200, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': type } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transport', () => {
  test('sends same-origin credentials to the /api base URL, and returns the body', async () => {
    const fetch = vi.fn(async (_input: string, _init?: RequestInit) => json({ items: [] }))
    vi.stubGlobal('fetch', fetch)
    await expect(transport('/transactions?limit=1')).resolves.toMatchObject({
      data: { items: [] },
      status: 200,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/transactions?limit=1',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  test('a request that never reaches the server is a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(transport('/transactions')).rejects.toMatchObject({ problem: { kind: 'network' } })
  })

  test('an error status keeps its status and its Problem body', async () => {
    const problem = { title: 'Unavailable', status: 503 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(problem, 503, 'application/problem+json')),
    )
    const error = await transport('/transactions').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ problem: { kind: 'http', status: 503, body: problem } })
  })

  test('a body that is not JSON is a contract error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{', { headers: { 'content-type': 'application/json' } })),
    )
    await expect(transport('/transactions')).rejects.toMatchObject({
      problem: { kind: 'contract' },
    })
  })

  test('a cancelled request passes through untouched, never as a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
          }),
      ),
    )
    const controller = new AbortController()
    const request = transport('/transactions', { signal: controller.signal })
    controller.abort()
    const error = await request.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })
})
