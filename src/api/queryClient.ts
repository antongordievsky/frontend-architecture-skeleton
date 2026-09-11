import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './transport.ts'

// D-03: the cache policy's one home. Only failures that may pass on their own are retried: the network,
// and the server's 5xx. A contract error or a 4xx — a 401 included (D-17) — shows at once.
export const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.problem.kind === 'network' ||
    (error.problem.kind === 'http' && error.problem.status >= 500))

export const createQueryClient = (): QueryClient =>
  new QueryClient({
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
