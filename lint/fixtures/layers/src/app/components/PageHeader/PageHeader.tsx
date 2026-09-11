import { Card } from '@/ui/Card'
// expect: app/pages/Dashboard is reached only through app/index.ts
import { DashboardPage } from '@/app/pages/Dashboard'

export const PageHeader = [Card, DashboardPage]
// expect: the router's Link is drawn by components/RouterLink
export { Link } from '@tanstack/react-router'
// expect: the router's Link is drawn by components/RouterLink
export * from '@tanstack/react-router'
