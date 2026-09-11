import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen.ts'

// D-05: the router's one home. Its typed context carries the query client, so a route's loader can
// prefetch through an adapter's queryOptions (D-03) and the screen reads the same cache entry.
// `history` is for tests, which run the router over memory history in Node.
export const createAppRouter = (queryClient: QueryClient, history?: RouterHistory) =>
  createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    ...(history === undefined ? {} : { history }),
  })

// Every link, parameter and search schema in the app is typed against this router.
declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- augmentation merges only into an interface
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
