import { getRouteApi, Link } from '@tanstack/react-router'

// D-05: the route's parameters, typed through the registered router. A page may not import its route
// file (D-16), so it names the route by its id.
const route = getRouteApi('/_app/transactions/$transactionId')

export function TransactionDetailsPage() {
  const { transactionId } = route.useParams()
  return (
    <>
      <h1>Transaction {transactionId}</h1>
      <p>A placeholder. A transaction's details arrive with the data they show.</p>
      <Link to="/transactions">Back to transactions</Link>
    </>
  )
}
