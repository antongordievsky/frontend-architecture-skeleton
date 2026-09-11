import { queryOptions } from '@tanstack/react-query'
import type { CryptoAmount, FiatAmount } from '@/domain/amount.ts'
import type { Transaction } from '@/domain/transaction.ts'
import { getListTransactionsQueryKey, listTransactions } from './generated/api.ts'
import {
  type CryptoAmountOutput,
  type FiatAmountOutput,
  type ListTransactionsParams,
  TransactionPage,
} from './generated/model/index.ts'
import { ApiError } from './transport.ts'

// D-03: screens never see the server's shape. The response is checked against the contract's schema
// and turned into read-only domain types here, inside the query function, so the cache holds what
// screens use: money as exact integers (D-08).

export type TransactionsPage = {
  readonly items: readonly Transaction[]
  readonly nextCursor: string | undefined
}

const toCrypto = (wire: CryptoAmountOutput): CryptoAmount => ({
  kind: 'crypto',
  asset: wire.asset,
  decimals: wire.decimals,
  units: BigInt(wire.baseUnits),
})

const toFiat = (wire: FiatAmountOutput): FiatAmount => ({
  kind: 'fiat',
  currency: wire.currency,
  exponent: wire.exponent,
  minor: BigInt(wire.minor),
})

const toPage = (data: unknown): TransactionsPage => {
  const page = TransactionPage.safeParse(data)
  if (!page.success) throw new ApiError({ kind: 'contract', issues: page.error.issues })
  return {
    items: page.data.items.map((t): Transaction => {
      const common = { id: t.id, occurredAt: t.occurredAt, value: toFiat(t.value) }
      switch (t.kind) {
        case 'deposit':
          return { ...common, kind: 'deposit', amount: toCrypto(t.amount) }
        case 'withdrawal':
          return { ...common, kind: 'withdrawal', amount: toCrypto(t.amount) }
        case 'trade':
          return { ...common, kind: 'trade', sold: toCrypto(t.sold), bought: toCrypto(t.bought) }
      }
    }),
    nextCursor: page.data.nextCursor,
  }
}

export const transactionsQuery = (params?: ListTransactionsParams) =>
  queryOptions({
    queryKey: getListTransactionsQueryKey(params),
    queryFn: async ({ signal }) => toPage((await listTransactions(params, { signal })).data),
  })
