import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'
import { SignInPage } from '@/public'

// QR-11: the address to return to after signing in must be a path on this site. To a browser, `//host`
// and `/\host` both name another origin, so they fail, as a full URL does; whatever fails falls back to
// the dashboard. The backend checks it again, because this check can be bypassed (D-18).
const localPath = z.string().check(z.regex(/^\/(?![/\\])/))

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z._default(z.catch(localPath, '/'), '/') }),
  component: SignInPage,
})
