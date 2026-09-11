import { Link } from './Link.tsx'

// D-14: one export per state. Each is mounted by Link.spec.ts in Playwright's gallery, in three engines. The tests
// never follow the links: the gallery would leave for the address.
export const Default = () => <Link href="/transactions">Transactions</Link>

export const Current = () => (
  <Link href="/transactions" aria-current="page">
    Transactions
  </Link>
)
