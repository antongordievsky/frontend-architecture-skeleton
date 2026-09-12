import type { LinkProps } from '@tanstack/react-router'
import { RouterLink } from '@/components/RouterLink'
import styles from './SideNav.module.css'

export type SideNavItem = {
  // The router's own union of addresses, minus `undefined`: an item without a destination is not an item, and
  // D-22's exactOptionalPropertyTypes would refuse to pass it on anyway.
  readonly to: NonNullable<LinkProps['to']>
  readonly label: string
}

export type SideNavProps = {
  // The landmark's name. Two zones use this part, and a screen reader announces which navigation it is in.
  readonly label: string
  readonly items: readonly SideNavItem[]
}

// D-16: one side navigation, drawn for whichever zone passes its items. It lives in components/ because a zone
// may not import another zone, and both need it. It knows no addresses of its own: they arrive as data, typed by
// the router, so a link to a screen that does not exist fails typecheck (D-05).
export function SideNav({ label, items }: SideNavProps) {
  return (
    <nav aria-label={label}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.to}>
            {/* Kept as insurance, and honestly unproven. The router's active test (link.js in
                @tanstack/react-router) compares the address's search params against the link's, partially,
                and `includeSearch` defaults to true — which says the row would stop being current once the
                transactions route gains `validateSearch` with defaults (plan 08) and someone sorts. A filter
                is not another screen (D-06). But removing this option does NOT flip the row in the story,
                even with a search schema on its route, because a link without an explicit `search` inherits
                the current address's params. So the option costs nothing and may save the case the source
                describes; the test that would prove it needs the real route, and belongs to plan 08. */}
            <RouterLink to={item.to} activeOptions={{ includeSearch: false }} variant="nav">
              {item.label}
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
