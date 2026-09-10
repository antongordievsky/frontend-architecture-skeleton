// expect: admin/ may not import app/: zones are isolated
import { TransactionsPage } from '@/app/pages/Transactions'
// expect: admin/ may not import app/: zones are isolated
import { DashboardPage } from '@/app'

export const UsersPage = [TransactionsPage, DashboardPage]
