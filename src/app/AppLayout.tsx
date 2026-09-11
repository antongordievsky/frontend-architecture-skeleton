import { Outlet } from '@tanstack/react-router'
import { RouterLink } from '@/components/RouterLink'
import styles from './AppLayout.module.css'

// The taxpayer's zone around every one of its pages. The router marks the current link with
// aria-current="page".
export function AppLayout() {
  return (
    <>
      <header className={styles.header}>
        <nav aria-label="Main">
          <ul className={styles.links}>
            <li>
              <RouterLink to="/" activeOptions={{ exact: true }}>
                Dashboard
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/transactions">Transactions</RouterLink>
            </li>
            <li>
              <RouterLink to="/settings">Settings</RouterLink>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
