import { Link, Outlet } from '@tanstack/react-router'

// The taxpayer's zone around every one of its pages. The router marks the current link with
// aria-current="page".
export function AppLayout() {
  return (
    <>
      <header>
        <nav aria-label="Main">
          <ul>
            <li>
              <Link to="/" activeOptions={{ exact: true }}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/transactions">Transactions</Link>
            </li>
            <li>
              <Link to="/settings">Settings</Link>
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
