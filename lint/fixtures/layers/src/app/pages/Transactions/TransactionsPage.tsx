import { listTransactions } from '@/api/transactions'
import { PageHeader } from '@/app/components/PageHeader'
import { AmountCell } from '@/components/AmountCell'
import type { Amount } from '@/domain/amount'
import { Table } from '@/ui/Table'
import { Table as TableWithSlash } from '@/ui/Table/'
import { TransactionsTable } from './components/TransactionsTable'
import { useTransactions } from './hooks/useTransactions'
// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
import type { DashboardProps } from '@/app/pages/Dashboard'
// expect: app/index.ts is imported only by the shell
import { DashboardPage as ThroughZone } from '@/app/'

// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
export type { DashboardProps as Props } from '@/app/pages/Dashboard'
// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
export * from '../Dashboard'

// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
const lazyDashboard = () => import('../Dashboard/DashboardPage')
// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
const lazyTemplate = () => import(`../Dashboard/DashboardPage`)
// expect: import() with a computed path cannot be checked against the layer map
const lazyComputed = (name: string) => import(`../${name}/index`)

export const TransactionsPage = [
  listTransactions,
  PageHeader,
  AmountCell,
  Table,
  TableWithSlash,
  TransactionsTable,
  useTransactions,
  ThroughZone,
  lazyDashboard,
  lazyTemplate,
  lazyComputed,
] as unknown as Amount & DashboardProps
