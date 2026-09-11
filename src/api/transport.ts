// D-03, D-17: the one exit to the network. The base URL, the credentials policy and the error shape live
// here and nowhere else; the generated client calls this function for every request (orval's mutator).

export type ApiProblem =
  | { readonly kind: 'network'; readonly cause: unknown }
  | { readonly kind: 'http'; readonly status: number; readonly body: unknown }
  | { readonly kind: 'contract'; readonly issues: readonly unknown[] }

export class ApiError extends Error {
  readonly problem: ApiProblem

  constructor(problem: ApiProblem) {
    super(`API ${problem.kind} error`)
    this.name = 'ApiError'
    this.problem = problem
  }
}

// orval reads this export and makes it the error type of every generated call.
export type ErrorType<_Body> = ApiError

// One origin everywhere: the dev server and Caddy proxy /api to the backend (D-04), so the session
// cookie goes to this site only. `include` would send it to any origin a wrong base URL named (D-17).
const BASE_URL = '/api'

export const transport = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  // A cancelled request is not a failure: the query library expects its own AbortError back.
  const cancelled = () => init.signal?.aborted === true
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${url}`, { ...init, credentials: 'same-origin' })
  } catch (cause) {
    if (cancelled()) throw cause
    throw new ApiError({ kind: 'network', cause })
  }
  let body: unknown
  try {
    body = response.headers.get('content-type')?.includes('json')
      ? await response.json()
      : undefined
  } catch (cause) {
    if (cancelled()) throw cause
    throw new ApiError({ kind: 'contract', issues: ['The response body is not valid JSON'] })
  }
  if (!response.ok) throw new ApiError({ kind: 'http', status: response.status, body })
  // The generated call declares T as { data, status, headers }. `data` is unchecked here: each adapter
  // checks it against the contract's schema (D-03).
  return { data: body, status: response.status, headers: response.headers } as T
}
