import { Card } from '@/ui/Card'
// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
import { TransactionsTable } from '../Transactions/components/TransactionsTable'

export type DashboardProps = { compact: boolean }
export const DashboardPage = [Card, TransactionsTable]
