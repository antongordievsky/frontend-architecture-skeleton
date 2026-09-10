import { listTransactions } from '@/api/transactions'
import { PageHeader } from '@/app/components/PageHeader'
import { AmountCell } from '@/components/AmountCell'
import type { Amount } from '@/domain/amount'
import { Table } from '@/ui/Table'
import { TransactionsTable } from './components/TransactionsTable'
import { useTransactions } from './hooks/useTransactions'
// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
import type { DashboardProps } from '@/app/pages/Dashboard'

// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
export type { DashboardProps as Props } from '@/app/pages/Dashboard'
// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
export * from '../Dashboard'

// expect: app/pages/Transactions imports app/pages/Dashboard: pages never import one another
const lazyDashboard = () => import('../Dashboard/DashboardPage')

export const TransactionsPage = [
  listTransactions,
  PageHeader,
  AmountCell,
  Table,
  TransactionsTable,
  useTransactions,
  lazyDashboard,
] as unknown as Amount & DashboardProps
