import { Card } from '../Card'
// expect: ui may not import api
import { listTransactions } from '../../api/transactions'

export const Table = [Card, listTransactions]
