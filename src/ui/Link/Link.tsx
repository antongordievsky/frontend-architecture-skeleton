import type { ReactNode } from 'react'
import {
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
  RouterProvider as AriaRouterProvider,
} from 'react-aria-components'
import styles from './Link.module.css'

// Two looks, both the kit's: `inline` is a link inside a sentence, `nav` is a row in a side navigation. A screen
// chooses which, and never writes either (D-28).
export type LinkVariant = 'inline' | 'nav'

export type LinkProps = Omit<AriaLinkProps, 'className' | 'style'> & {
  readonly variant?: LinkVariant
}

type LinkNavigationProps = {
  readonly navigate: (href: string) => void
  readonly children: ReactNode
}

// React Aria follows a link pressed with Enter by itself, with a click the app's router never sees, so the page
// loaded again (measured in plan 06, all three engines). Given the app's navigate, every Link inside moves within
// the app. The kit stays free of the router: the app passes the function in.
export function LinkNavigation({ navigate, children }: LinkNavigationProps) {
  return <AriaRouterProvider navigate={navigate}>{children}</AriaRouterProvider>
}

// D-07: a link's press, its focus ring for the keyboard and its current-page state come from React Aria; the look
// is ours (D-28). It knows nothing of the router, so the kit can leave the app (DR-1): components/RouterLink
// gives it the routes.
// No default in the parameter list: the React Compiler (D-13) cannot lower a default beside a rest element
// — "Expected object property value to be an LVal, got: AssignmentPattern" — and panicThreshold 'all_errors'
// turns that into a build error rather than a silently unoptimised component. The absent variant is `inline`,
// which the expression below says just as plainly.
export function Link({ variant, ...props }: LinkProps) {
  return <AriaLink {...props} className={variant === 'nav' ? styles.nav : styles.link} />
}
