import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

type RouterContext = { readonly queryClient: QueryClient }

// D-05: every route sees the query client, so a loader can prefetch through an adapter (D-03).
export const Route = createRootRouteWithContext<RouterContext>()({ component: Outlet })
