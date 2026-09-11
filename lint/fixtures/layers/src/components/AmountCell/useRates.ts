// Composites may import api, but not its generated client.
// expect: api/generated is private to api
import { listTransactions } from '@/api/generated/api'

export const useRates = () => listTransactions()
