import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/app'

export const Route = createFileRoute('/_app/')({ component: DashboardPage })
