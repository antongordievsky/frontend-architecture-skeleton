import { useTransactions } from '../hooks/useTransactions'
// expect: ui/Table is private: import it through its index.ts
import { Table } from '@/ui/Table/Table'

export const TransactionsTable = [useTransactions, Table]
