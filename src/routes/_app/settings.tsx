import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/app'

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage })
