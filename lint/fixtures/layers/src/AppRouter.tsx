import { DashboardPage, TransactionsPage } from '@/app'
// expect: app/pages/Transactions is reached only through app/index.ts
import { TransactionsPage as Direct } from '@/app/pages/Transactions'

export const AppRouter = [TransactionsPage, DashboardPage, Direct]
