import { getRouteApi } from '@tanstack/react-router'
import { RouterLink } from '@/components/RouterLink'

// D-05: the route's parameters, typed through the registered router. A page may not import its route
// file (D-16), so it names the route by its id.
const route = getRouteApi('/_app/transactions/$transactionId')

export function TransactionDetailsPage() {
  const { transactionId } = route.useParams()
  return (
    <>
      <h1>Transaction {transactionId}</h1>
      <p>A placeholder. A transaction's details arrive with the data they show.</p>
      {/* Exact: the router counts a link as current on its child addresses too, and a screen reader
          would announce this one as the current page. */}
      <RouterLink to="/transactions" activeOptions={{ exact: true }}>
        Back to transactions
      </RouterLink>
    </>
  )
}
