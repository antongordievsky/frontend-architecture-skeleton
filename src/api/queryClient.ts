import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './transport.ts'

// D-03: the cache policy's one home. Only failures that may pass on their own are retried: the network,
// and the server's 5xx. A contract error or a 4xx — a 401 included (D-17) — shows at once.
export const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.problem.kind === 'network' ||
    (error.problem.kind === 'http' && error.problem.status >= 500))

// D-17, D-18: a 401 from any query means the session has ended. api cannot import the router, so it
// raises one signal and the shell answers it (router.ts, endSession).
export const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.problem.kind === 'http' && error.problem.status === 401

export type QueryClientOptions = { readonly onUnauthorized?: () => void }

export const createQueryClient = ({ onUnauthorized }: QueryClientOptions = {}): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isUnauthorized(error)) onUnauthorized?.()
      },
    }),
    defaultOptions: {
      queries: { retry: (failures, error) => failures < 3 && isRetryable(error) },
    },
  })

// Every query's error is typed as the transport's one error shape.
declare module '@tanstack/react-query' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- augmentation merges only into an interface
  interface Register {
    defaultError: ApiError
  }
}
