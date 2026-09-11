import { createFileRoute } from '@tanstack/react-router'
import { TransactionDetailsPage } from '@/app'

export const Route = createFileRoute('/_app/transactions/$transactionId')({
  component: TransactionDetailsPage,
})
