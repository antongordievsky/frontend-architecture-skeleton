import { createFileRoute } from '@tanstack/react-router'
import { parseTransactionsSearch, transactionsInfiniteQuery } from '@/api/transactions.ts'
import { TransactionsPage } from '@/app'

// D-05: thin. A path, a search schema, and the page from its zone. The loader prefetches the first page
// through the same queryOptions the screen reads, so both share one cache entry (D-03, D-06).
export const Route = createFileRoute('/_app/transactions/')({
  validateSearch: parseTransactionsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.prefetchInfiniteQuery(transactionsInfiniteQuery(deps)),
  component: TransactionsPage,
})
