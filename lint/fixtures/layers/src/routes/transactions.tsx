import { TransactionsPage } from '@/app'
// expect: app/pages/Transactions is reached only through app/index.ts
import { TransactionsTable } from '@/app/pages/Transactions/components/TransactionsTable'
import { Card } from '@/ui/Card'

export const Route = [TransactionsPage, TransactionsTable, Card]
