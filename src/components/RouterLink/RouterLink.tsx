import { createLink } from '@tanstack/react-router'
import { Link } from '@/ui/Link'

// D-05, D-07: the router's typed `to`, params and search, rendered by the kit's Link. The router marks the link
// to the current page with aria-current="page", which the Link styles. This is TanStack Router's documented way
// to use a React Aria link.
export const RouterLink = createLink(Link)
