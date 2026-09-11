import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { useState } from 'react'
import { RouterLink } from './RouterLink.tsx'

// D-14: the story owns its router, in memory, with two of the app's addresses; it starts on the second.
const root = createRootRoute({
  component: () => (
    <>
      <nav aria-label="Main">
        <RouterLink to="/" activeOptions={{ exact: true }}>
          Dashboard
        </RouterLink>{' '}
        <RouterLink to="/transactions">Transactions</RouterLink>
      </nav>
      <Outlet />
    </>
  ),
})
const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/' }),
  createRoute({ getParentRoute: () => root, path: '/transactions' }),
])

export const Navigation = () => {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/transactions'] }),
    }),
  )
  return <RouterProvider router={router} />
}
