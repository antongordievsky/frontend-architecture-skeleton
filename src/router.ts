import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { NotFoundScreen, RouteErrorScreen } from '@/components/ErrorScreen'
import { routeTree } from './routeTree.gen.ts'

// D-05: the router's one home. Its typed context carries the query client, so a route's loader can
// prefetch through an adapter's queryOptions (D-03) and the screen reads the same cache entry.
// `history` is for tests, which run the router over memory history in Node.
export const createAppRouter = (queryClient: QueryClient, history?: RouterHistory) =>
  createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // D-18: every route shows the same clear states when something fails, from the API's answer.
    defaultErrorComponent: RouteErrorScreen,
    defaultNotFoundComponent: NotFoundScreen,
    ...(history === undefined ? {} : { history }),
  })

export type AppRouter = ReturnType<typeof createAppRouter>

// D-17 (amended), D-18: the shell's answer to the query client's 401 signal. The cache is cleared, so no
// financial data outlives the session in memory. The user goes to sign in, with the address to come back
// to; replacing the entry keeps Back from returning to a page that would fail again.
export const endSession = (router: AppRouter, queryClient: QueryClient): Promise<void> => {
  queryClient.clear()
  const { pathname, href } = router.state.location
  if (pathname === '/sign-in') return Promise.resolve()
  return router.navigate({ to: '/sign-in', search: { redirect: href }, replace: true })
}

// Every link, parameter and search schema in the app is typed against this router.
declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- augmentation merges only into an interface
  interface Register {
    router: AppRouter
  }
}
