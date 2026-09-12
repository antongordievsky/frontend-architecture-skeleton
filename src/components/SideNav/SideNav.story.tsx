import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { useState } from 'react'
import { RouterLinkNavigation } from '@/components/RouterLink'
import { SideNav } from './SideNav.tsx'

// D-14: the story owns its router, in memory, with the app's addresses. It starts on the transactions page with
// a sort in the address, because that is the case the navigation has to survive (D-06): a filter is not another
// screen. Its root is wired as the app's root route is, so Enter moves within the app rather than loading the
// page again.
const root = createRootRoute({
  component: () => (
    <RouterLinkNavigation>
      <SideNav
        label="Main"
        items={[
          { to: '/', label: 'Dashboard' },
          { to: '/transactions', label: 'Transactions' },
          { to: '/settings', label: 'Settings' },
        ]}
      />
      <Outlet />
    </RouterLinkNavigation>
  ),
})
const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/' }),
  // The transactions route carries a search schema with a default, as the app's will (D-06, plan 08). Without
  // one the link's search is empty and the router's comparison never runs, so the story would assert nothing.
  createRoute({
    getParentRoute: () => root,
    path: '/transactions',
    validateSearch: (search: Record<string, unknown>) => ({
      sort: typeof search['sort'] === 'string' ? search['sort'] : 'occurredAt:desc',
    }),
  }),
  createRoute({ getParentRoute: () => root, path: '/settings' }),
])

export const Main = () => {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/transactions?sort=value%3Adesc'] }),
    }),
  )
  return <RouterProvider router={router} />
}
