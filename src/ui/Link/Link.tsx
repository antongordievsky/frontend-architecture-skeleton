import { Link as AriaLink, type LinkProps as AriaLinkProps } from 'react-aria-components'
import styles from './Link.module.css'

export type LinkProps = Omit<AriaLinkProps, 'className' | 'style'>

// D-07: a link's press, its focus ring for the keyboard and its current-page state come from React Aria; the look
// is ours (D-28). It knows nothing of the router, so the kit can leave the app (DR-1): components/RouterLink
// gives it the routes.
export function Link(props: LinkProps) {
  return <AriaLink {...props} className={styles.link} />
}
