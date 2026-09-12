import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { useState } from 'react'
import { TRANSACTIONS_DEFAULT_SEARCH } from '@/api/transactions.ts'
import { RouterLink } from './RouterLink.tsx'
import { RouterLinkNavigation } from './RouterLinkNavigation.tsx'

// D-14: the story owns its router, in memory, with two of the app's addresses; it starts on the second. Its root
// is wired as the app's root route is.
const root = createRootRoute({
  component: () => (
    <RouterLinkNavigation>
      <nav aria-label="Main">
        <RouterLink to="/" activeOptions={{ exact: true }}>
          Dashboard
        </RouterLink>{' '}
        {/* Typed against the registered router, not this story's memory tree, so the link names the
            search the real route requires (D-06). */}
        <RouterLink to="/transactions" search={TRANSACTIONS_DEFAULT_SEARCH}>
          Transactions
        </RouterLink>
      </nav>
      <Outlet />
    </RouterLinkNavigation>
  ),
})
const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/' }),
  // The real route validates its search (D-06, plan 08), and the router compares search when it decides
  // whether a link is current. Without the schema here the story's address has no sort, the link's has one,
  // and aria-current disappears — measured, which is what plan 07's review predicted would happen.
  createRoute({
    getParentRoute: () => root,
    path: '/transactions',
    validateSearch: (search: Record<string, unknown>) => ({
      sort: typeof search['sort'] === 'string' ? search['sort'] : 'occurredAt:desc',
    }),
  }),
])

export const Navigation = () => {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/transactions?sort=occurredAt%3Adesc'] }),
    }),
  )
  return <RouterProvider router={router} />
}
