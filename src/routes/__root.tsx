import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { RouterLinkNavigation } from '@/components/RouterLink'

type RouterContext = { readonly queryClient: QueryClient }

// D-05: every route sees the query client, so a loader can prefetch through an adapter (D-03). Every link below
// the root moves within the app when followed by the keyboard, as it does by a click (D-07).
export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <RouterLinkNavigation>
      <Outlet />
    </RouterLinkNavigation>
  ),
})
