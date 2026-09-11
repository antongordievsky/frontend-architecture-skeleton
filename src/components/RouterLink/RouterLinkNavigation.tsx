import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LinkNavigation } from '@/ui/Link'

// Wraps the routes once, in the root route: a link followed by the keyboard then moves within the app, as a
// click does, instead of loading the page again (plan 06).
export function RouterLinkNavigation({ children }: { readonly children: ReactNode }) {
  const router = useRouter()
  return (
    <LinkNavigation navigate={(href) => void router.navigate({ href })}>{children}</LinkNavigation>
  )
}
