import { afterEach, describe, expect, test, vi } from 'vitest'
import { asFetch, createHandler } from '../../mock/handler.ts'
import { createQueryClient, isRetryable } from './queryClient.ts'
import { transactionsQuery } from './transactions.ts'
import { ApiError } from './transport.ts'

describe('isRetryable', () => {
  test('retries what may pass on its own: the network, and 5xx', () => {
    expect(isRetryable(new ApiError({ kind: 'network', cause: new TypeError('offline') }))).toBe(
      true,
    )
    expect(isRetryable(new ApiError({ kind: 'http', status: 503, body: undefined }))).toBe(true)
  })

  test('shows at once what a retry cannot fix: 4xx, a 401 included, and a broken contract', () => {
    expect(isRetryable(new ApiError({ kind: 'http', status: 404, body: undefined }))).toBe(false)
    expect(isRetryable(new ApiError({ kind: 'http', status: 401, body: undefined }))).toBe(false)
    expect(isRetryable(new ApiError({ kind: 'contract', issues: [] }))).toBe(false)
    expect(isRetryable(new Error('not from the transport'))).toBe(false)
  })
})

// Integration (D-09): a real query through the transport, over the stand-in answering every request
// with one status (D-04).
describe('the 401 signal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const signalsOn = async (failStatus: number) => {
    vi.stubGlobal('fetch', asFetch(createHandler({ failStatus })))
    const onUnauthorized = vi.fn()
    await createQueryClient({ onUnauthorized })
      .fetchQuery(transactionsQuery())
      .catch(() => undefined)
    return onUnauthorized
  }

  test('a 401 from any query raises it once: the session has ended (D-17)', async () => {
    expect(await signalsOn(401)).toHaveBeenCalledOnce()
  })

  test('a 403 does not: the user is signed in, only refused (D-18)', async () => {
    expect(await signalsOn(403)).not.toHaveBeenCalled()
  })
})
