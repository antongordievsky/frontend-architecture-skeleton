// D-04: the stand-in for the backend, as one Web-standard function. Plan 07 serves it with Bun behind /api;
// until then tests plug it straight into `fetch`. It answers the contract's endpoints and nothing else.
import {
  ListTransactionsParams,
  type ListTransactionsParamsOutput,
  type Transaction,
  type TransactionPage,
} from '../src/api/generated/model/index.ts'
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

/**
 * D-06: the order the whole set is read in. `value` is the fiat value the server recorded; a crypto amount
 * is never compared across assets (QR-1, D-08).
 *
 * Compared as BigInt, not Number: a value in minor units can exceed what a double holds exactly, and this
 * is the stand-in for a server that would compare them in the database.
 *
 * Every comparison ends with the id, and a deliberate break (QR-23) measured exactly what that is worth:
 * removing the tiebreaker left every test green. The dataset does hold ties — 9 pairs of equal `value.minor`
 * in 10 000 rows, measured — but `Array.prototype.sort` is stable, so equal rows keep their input order and
 * every request returns the same sequence anyway. The tiebreaker therefore guards nothing observable *here*;
 * it guards the move to a real server, where rows of equal value come back in whatever order the database
 * chose and a cursor walking them would repeat one row and skip another. `sortedFor` is exported so that a
 * test can feed the same rows in two orders and see the tiebreaker do that job.
 */
export const sortedFor = (
  rows: readonly Transaction[],
  sort: ListTransactionsParamsOutput['sort'],
): readonly Transaction[] => {
  const byId = (a: Transaction, b: Transaction) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const compare = (a: Transaction, b: Transaction): number => {
    switch (sort) {
      case 'occurredAt:asc':
        return a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : byId(a, b)
      case 'occurredAt:desc':
        return a.occurredAt > b.occurredAt ? -1 : a.occurredAt < b.occurredAt ? 1 : byId(a, b)
      case 'value:asc': {
        const left = BigInt(a.value.minor)
        const right = BigInt(b.value.minor)
        return left < right ? -1 : left > right ? 1 : byId(a, b)
      }
      case 'value:desc': {
        const left = BigInt(a.value.minor)
        const right = BigInt(b.value.minor)
        return left > right ? -1 : left < right ? 1 : byId(a, b)
      }
    }
  }
  return [...rows].sort(compare)
}

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
      // Absent means the contract's default, occurredAt:desc; anything the enum does not name is a 400,
      // which the schema decides rather than this code.
      sort: url.searchParams.get('sort') ?? undefined,
    })
    if (!query.success) return problem(400, 'Invalid query')
    const { cursor = '0', limit, kind, sort } = query.data
    // Opaque to the client; here it is an offset into the dataset.
    if (!/^\d+$/.test(cursor)) return problem(400, 'Invalid cursor')
    // D-06: filter, then order, then cut the page — over the whole set. Ordering inside the page would
    // make the first hundred rows by value look like the hundred largest, which they are not.
    const rows = sortedFor(kind ? dataset.filter((t) => t.kind === kind) : dataset, sort)
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
