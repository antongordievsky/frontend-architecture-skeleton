import { Outlet } from '@tanstack/react-router'
import { SideNav } from '@/components/SideNav'
import styles from './AppLayout.module.css'

// The taxpayer's own screens. The support zone will pass its own list to the same navigation (D-30).
const ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/settings', label: 'Settings' },
] as const

// The taxpayer's zone around every one of its pages: a sidebar beside the page itself. The router marks the
// current row (D-05), and the navigation is a named landmark, so it can be reached and skipped (QR-12).
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>Tallyfolio</p>
        <SideNav label="Main" items={ITEMS} />
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
