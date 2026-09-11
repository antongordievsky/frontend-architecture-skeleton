import { describe, expect, test } from 'vitest'
import { isRetryable } from './queryClient.ts'
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
