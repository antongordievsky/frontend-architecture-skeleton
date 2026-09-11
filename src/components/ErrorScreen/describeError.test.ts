import { describe, expect, test } from 'vitest'
import { ApiError } from '@/api/transport.ts'
import { describeError, NOT_FOUND } from './describeError.ts'

const http = (status: number, body?: unknown) => new ApiError({ kind: 'http', status, body })

describe('describeError', () => {
  test.each([
    ['a 401: the session ended', http(401), 'sign-in', 'Your session has ended'],
    ['a 403: no access', http(403), 'home', "You don't have access to this"],
    ['a 404: not found', http(404), 'home', 'Page not found'],
    ['a 5xx: our side', http(503), 'retry', 'Something went wrong on our side'],
    [
      'the network',
      new ApiError({ kind: 'network', cause: new TypeError('offline') }),
      'retry',
      "We can't reach Tallyfolio",
    ],
    [
      'a broken contract',
      new ApiError({ kind: 'contract', issues: [] }),
      'retry',
      'Something went wrong',
    ],
    ['another 4xx', http(400), 'retry', 'Something went wrong'],
    ['a render error', new Error('boom'), 'retry', 'Something went wrong'],
  ])('%s', (_, error, action, title) => {
    expect(describeError(error)).toMatchObject({ action, title })
  })

  test('an unknown address and a 404 from the API read the same', () => {
    expect(describeError(http(404))).toBe(NOT_FOUND)
  })

  test("never repeats the server's words, which may carry financial data (QR-10)", () => {
    const error = http(403, { title: 'Account 4417 cannot see 3.2 BTC' })
    expect(JSON.stringify(describeError(error))).not.toMatch(/4417|BTC/)
  })
})
