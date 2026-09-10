// expect: domain may not import api
import { listTransactions } from '@/api/transactions'

export type Amount = { units: bigint; decimals: number }
export const source = listTransactions
