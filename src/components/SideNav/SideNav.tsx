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
            {/* No activeOptions. Measured in this story, in chromium: neither `exact: false` nor
                `includeSearch: true` changes which row is current, because the router decides by the route it
                matched, and a link carrying no search params is a subset of any address's params. Passing
                either would be decoration. What matters — that a filter in the address is still the same
                screen (D-06) — is asserted by the spec, on a story whose address carries a sort. */}
            <RouterLink to={item.to} variant="nav">
              {item.label}
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
