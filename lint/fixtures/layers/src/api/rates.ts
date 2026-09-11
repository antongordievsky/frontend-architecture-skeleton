// api owns its generated client: allowed.
import { listTransactions } from './generated/api'
// expect: only a test file may reach mock/
import { createHandler } from '../../mock/handler'

export const rates = [listTransactions, createHandler]
