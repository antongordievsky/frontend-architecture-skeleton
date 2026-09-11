import { getRouteApi } from '@tanstack/react-router'

// The return address arrives already checked by the route's search schema (QR-11), and renders as text.
const route = getRouteApi('/sign-in')

export function SignInPage() {
  const { redirect } = route.useSearch()
  return (
    <main>
      <h1>Sign in</h1>
      <p>
        A placeholder. Signing in happens on Tallyfolio's servers; the button that starts it arrives
        with the backend's sign-in.
      </p>
      <p>
        After signing in, you return to <code>{redirect}</code>.
      </p>
    </main>
  )
}
