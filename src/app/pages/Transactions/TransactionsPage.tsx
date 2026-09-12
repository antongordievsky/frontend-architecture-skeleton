import { useInfiniteQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type TransactionsSearch, transactionsInfiniteQuery } from '@/api/transactions.ts'
import { describeError } from '@/components/ErrorScreen'
import type { Transaction } from '@/domain/transaction.ts'
import { formatAmount } from '@/domain/amount.ts'
import { Button } from '@/ui/Button'
import { Table, type TableColumn, type TableSortDescriptor } from '@/ui/Table'
import styles from './TransactionsPage.module.css'

// D-05: the page reads its parameters through the route api, never by importing the route file.
const route = getRouteApi('/_app/transactions/')

// D-06: the order is a question for the server, and the address is where the question lives. The table's
// own sort state is derived from it, so a shared link shows the same rows in the same order.
const toDescriptor = (sort: TransactionsSearch['sort']): TableSortDescriptor => {
  const [column, direction] = sort.split(':')
  return {
    column: column ?? 'occurredAt',
    direction: direction === 'asc' ? 'ascending' : 'descending',
  }
}

const toSort = (descriptor: TableSortDescriptor): TransactionsSearch['sort'] => {
  const direction = descriptor.direction === 'ascending' ? 'asc' : 'desc'
  return descriptor.column === 'value' ? `value:${direction}` : `occurredAt:${direction}`
}

// The locale is the browser's, and formatting happens here — at the render boundary, never in the cache.
const LOCALE = 'en-GB'

// Columns as data, beside the page: one row of markup, not one per column (FR-7).
const COLUMNS: readonly TableColumn<Transaction>[] = [
  {
    id: 'occurredAt',
    label: 'Date',
    sortable: true,
    isRowHeader: true,
    cell: (row) => row.occurredAt.slice(0, 10),
  },
  { id: 'kind', label: 'Kind', cell: (row) => row.kind },
  {
    id: 'amount',
    label: 'Amount',
    cell: (row) =>
      row.kind === 'trade'
        ? `${formatAmount(row.sold, LOCALE)} ${row.sold.asset} → ${formatAmount(row.bought, LOCALE)} ${row.bought.asset}`
        : `${formatAmount(row.amount, LOCALE)} ${row.amount.asset}`,
  },
  { id: 'value', label: 'Value', sortable: true, cell: (row) => formatAmount(row.value, LOCALE) },
]

export function TransactionsPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const query = useInfiniteQuery(transactionsInfiniteQuery(search))

  // FR-7, QR-4: the four states in one component. Loading and error come first, because a screen that
  // renders a table of nothing while it waits tells the reader something untrue.
  if (query.isPending) return <p className={styles.state}>Loading transactions…</p>
  if (query.isError) {
    const problem = describeError(query.error)
    return (
      <section className={styles.state}>
        <h1>Transactions</h1>
        <p>{problem.title}</p>
        <p className={styles.detail}>{problem.message}</p>
        <Button onPress={() => void query.refetch()}>Try again</Button>
      </section>
    )
  }

  const rows = query.data.pages.flatMap((page) => page.items)
  return (
    <section>
      <h1>Transactions</h1>
      <Table
        label="Transactions"
        columns={COLUMNS}
        rows={rows}
        sortDescriptor={toDescriptor(search.sort)}
        onSortChange={(descriptor) =>
          void navigate({ search: { ...search, sort: toSort(descriptor) } })
        }
        renderEmptyState={() =>
          search.kind === undefined
            ? 'No transactions yet. Connect a wallet or an exchange to import them.'
            : `No ${search.kind} transactions. Clear the filter to see everything.`
        }
      />
      <div className={styles.more}>
        <p className={styles.detail}>
          {rows.length} of the set loaded{query.hasNextPage ? '' : ' — that is all of it'}
        </p>
        {query.hasNextPage ? (
          <Button isDisabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        ) : undefined}
      </div>
    </section>
  )
}
