import type { Transaction } from '@/domain/transaction'
// Bare imports are not the layer rule's business: React is allowed here (CC-04).
import { useState } from 'react'
// expect: app/index.ts is imported only by the shell
import { TransactionsPage } from '@/app'
// expect: api may not import ui
import { Card } from '@/ui/Card'

export const listTransactions = (): Transaction[] => [useState, TransactionsPage, Card] as never
