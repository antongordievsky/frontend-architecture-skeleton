import { ApiError } from '@/api/transport.ts'

// D-18: the frontend renders what the API answered. Every failure becomes one of a few standard states,
// each saying what happened and what to do next. The words are fixed: they never repeat the server's,
// which may carry amounts or names (QR-10).

export type ErrorAction = 'sign-in' | 'home' | 'retry'

export type ErrorDescription = {
  readonly title: string
  readonly message: string
  readonly action: ErrorAction
}

export const NOT_FOUND: ErrorDescription = {
  title: 'Page not found',
  message: 'Nothing lives at this address. The link may be wrong, or the page may have moved.',
  action: 'home',
}

const SOMETHING_WRONG: ErrorDescription = {
  title: 'Something went wrong',
  message: 'Try again. If it keeps happening, contact support.',
  action: 'retry',
}

const describeStatus = (status: number): ErrorDescription => {
  if (status === 401) {
    return {
      title: 'Your session has ended',
      message: 'Sign in again to pick up where you left off.',
      action: 'sign-in',
    }
  }
  if (status === 403) {
    return {
      title: "You don't have access to this",
      message:
        "Your account can't open this page. If you think it should, ask the account's owner or contact support.",
      action: 'home',
    }
  }
  if (status === 404) return NOT_FOUND
  if (status >= 500) {
    return {
      title: 'Something went wrong on our side',
      message: "It isn't you. Try again in a moment.",
      action: 'retry',
    }
  }
  return SOMETHING_WRONG
}

export const describeError = (error: unknown): ErrorDescription => {
  if (!(error instanceof ApiError)) return SOMETHING_WRONG
  const { problem } = error
  switch (problem.kind) {
    case 'http':
      return describeStatus(problem.status)
    case 'network':
      return {
        title: "We can't reach the server",
        message: 'Check your connection, then try again.',
        action: 'retry',
      }
    case 'contract':
      return SOMETHING_WRONG
  }
}
