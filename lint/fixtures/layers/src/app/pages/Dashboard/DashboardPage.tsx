import { Card } from '@/ui/Card'
// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
import { TransactionsTable } from '../Transactions/components/TransactionsTable'
// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
import Legacy = require('../Transactions/TransactionsPage')

// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
export type TransactionsShape = import('@/app/pages/Transactions').TransactionsPageProps
export type DashboardProps = { compact: boolean }
export const DashboardPage = [Card, TransactionsTable, Legacy]
