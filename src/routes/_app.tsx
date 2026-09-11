import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/app'

// The taxpayer's zone, as a pathless layout. The sign-in check (D-17) and a guard (D-18) go in its
// beforeLoad, and cover every route below it.
export const Route = createFileRoute('/_app')({ component: AppLayout })
