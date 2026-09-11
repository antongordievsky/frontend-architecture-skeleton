import { type ErrorComponentProps, useRouter, useRouterState } from '@tanstack/react-router'
import { useId } from 'react'
import { RouterLink } from '@/components/RouterLink'
import { Button } from '@/ui/Button'
import { describeError, type ErrorDescription, NOT_FOUND } from './describeError.ts'

type Props = { readonly description: ErrorDescription; readonly onRetry?: () => void }

// One standard state for every failure (D-18): a heading that says what happened, and one way forward.
function ErrorScreen({ description, onRetry }: Props) {
  const titleId = useId()
  const href = useRouterState({ select: (state) => state.location.href })
  return (
    <section aria-labelledby={titleId}>
      <h1 id={titleId}>{description.title}</h1>
      <p>{description.message}</p>
      {description.action === 'sign-in' && (
        <RouterLink to="/sign-in" search={{ redirect: href }}>
          Sign in
        </RouterLink>
      )}
      {description.action === 'home' && <RouterLink to="/">Go to the dashboard</RouterLink>}
      {description.action === 'retry' && onRetry !== undefined && (
        <Button onPress={onRetry}>Try again</Button>
      )}
    </section>
  )
}

// The router's default for a route that fails. Trying again re-runs the routes' loaders.
export function RouteErrorScreen({ error }: ErrorComponentProps) {
  const router = useRouter()
  return <ErrorScreen description={describeError(error)} onRetry={() => void router.invalidate()} />
}

// The router's default for an address that matches no route.
export function NotFoundScreen() {
  return <ErrorScreen description={NOT_FOUND} />
}
