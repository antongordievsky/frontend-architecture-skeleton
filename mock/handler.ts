// D-04: the stand-in for the backend, as one Web-standard function. Plan 07 serves it with Bun behind /api;
// until then tests plug it straight into `fetch`. It answers the contract's endpoints and nothing else.
import type { TransactionPage } from '../src/api/generated/model/index.ts'
import { generateTransactions } from './dataset.ts'

export type MockOptions = {
  readonly seed?: number
  readonly count?: number
  /** Delay before every answer, to see loading states. */
  readonly latencyMs?: number
  /** Answer every request with this status, to see error states. */
  readonly failStatus?: number
}

const problem = (status: number, title: string) =>
  Response.json(
    { title, status },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )

// Honours the caller's abort, as a real server connection would.
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })

export const createHandler = (options: MockOptions = {}) => {
  const dataset = generateTransactions(options.seed ?? 42, options.count ?? 10_000)
  return async (request: Request): Promise<Response> => {
    await sleep(options.latencyMs ?? 0, request.signal)
    if (options.failStatus !== undefined) return problem(options.failStatus, 'Injected failure')
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/api/transactions') {
      return problem(404, 'Not found')
    }
    const kind = url.searchParams.get('kind')
    const rows = kind ? dataset.filter((t) => t.kind === kind) : dataset
    const start = Number(url.searchParams.get('cursor') ?? 0)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200)
    const items = rows.slice(start, start + limit)
    const page: TransactionPage =
      start + limit < rows.length ? { items, nextCursor: String(start + limit) } : { items }
    return Response.json(page)
  }
}

// A test puts the handler where the network was: relative URLs resolve against a fixed origin.
export const asFetch =
  (handler: (request: Request) => Promise<Response>): typeof fetch =>
  (input, init) =>
    handler(new Request(new URL(String(input), 'http://localhost'), init))
