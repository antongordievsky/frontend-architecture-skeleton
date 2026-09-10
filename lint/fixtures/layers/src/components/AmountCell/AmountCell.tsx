import type { Amount } from '@/domain/amount'
import { Card } from '@/ui/Card'
// expect: app/index.ts is imported only by the shell
import { DashboardPage } from '@/app'

export const AmountCell = [Card, DashboardPage] as unknown as Amount
