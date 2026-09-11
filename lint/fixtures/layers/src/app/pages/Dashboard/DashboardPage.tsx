import { Card } from '@/ui/Card'
// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
import { TransactionsTable } from '../Transactions/components/TransactionsTable'
// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
import Legacy = require('../Transactions/TransactionsPage')

// expect: app/pages/Dashboard imports app/pages/Transactions: pages never import one another
export type TransactionsShape = import('@/app/pages/Transactions').TransactionsPageProps
// expect: zone may not import shell
import { Route } from '@/routes/transactions'
// expect: react-aria-components is the kit's library: only ui/ imports it
import { Button } from 'react-aria-components'
// expect: the router's Link is drawn by components/RouterLink
import { Link, Outlet } from '@tanstack/react-router'
// expect: a story is for the gallery and its tests
import { Default } from '@/ui/Card/Card.story'
export type DashboardProps = { compact: boolean }
export const DashboardPage = [Card, TransactionsTable, Legacy, Route, Button, Link, Outlet, Default]
