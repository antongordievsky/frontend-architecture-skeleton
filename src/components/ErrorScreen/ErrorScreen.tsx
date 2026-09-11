import { type ErrorComponentProps, Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useId } from 'react'
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
        <Link to="/sign-in" search={{ redirect: href }}>
          Sign in
        </Link>
      )}
      {description.action === 'home' && <Link to="/">Go to the dashboard</Link>}
      {description.action === 'retry' && onRetry !== undefined && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
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
