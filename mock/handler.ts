// D-04: the stand-in for the backend, as one Web-standard function. Plan 07 serves it with Bun behind /api;
// until then tests plug it straight into `fetch`. It answers the contract's endpoints and nothing else.
import { ListTransactionsParams, type TransactionPage } from '../src/api/generated/model/index.ts'
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
    // The contract's own schema judges the query, so the stand-in refuses what the real server would —
    // a limit of 0 would otherwise page forever.
    const query = ListTransactionsParams.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined,
      kind: url.searchParams.get('kind') ?? undefined,
    })
    if (!query.success) return problem(400, 'Invalid query')
    const { cursor = '0', limit, kind } = query.data
    // Opaque to the client; here it is an offset into the dataset.
    if (!/^\d+$/.test(cursor)) return problem(400, 'Invalid cursor')
    const rows = kind ? dataset.filter((t) => t.kind === kind) : dataset
    const start = Number(cursor)
    const items = rows.slice(start, start + limit)
    const page: TransactionPage =
      start + limit < rows.length ? { items, nextCursor: String(start + limit) } : { items }
    return Response.json(page)
  }
}

/**
 * A test puts the handler where the network was: relative URLs resolve against a fixed origin.
 *
 * Not `typeof fetch`: this takes a URL and returns a response, and that is all the tests ask of it.
 * The wider promise was never true — there is no `preconnect` here, and a `Request` argument would be
 * stringified rather than honoured. @types/bun (added 2026-09-12 for mock/server.ts) made the gap a
 * compile error, which is the type doing its job.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export const asFetch =
  (handler: (request: Request) => Promise<Response>): FetchLike =>
  (url, init) =>
    // `new URL(...).href`, not the URL itself: Request takes a string or a Request, and Bun's types
    // (unlike the DOM's) say so.
    handler(new Request(new URL(url, 'http://localhost').href, init))
