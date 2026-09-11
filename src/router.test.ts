import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { describe, expect, test } from 'vitest'
import { createAppRouter, endSession } from './router.ts'

// The real router and route tree, in Node over memory history. Nothing is rendered (D-09).
const openAt = async (href: string, queryClient = new QueryClient()) => {
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [href] }))
  await router.load()
  return router
}

describe('endSession, the answer to a 401 (D-17, D-18)', () => {
  test('clears the cache, so no financial data outlives the session', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['/transactions'], { items: ['a page of transactions'] })
    await endSession(await openAt('/transactions/tx-1', queryClient), queryClient)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  test('sends the user to sign in, with the address to come back to', async () => {
    const queryClient = new QueryClient()
    const router = await openAt('/transactions/tx-1', queryClient)
    await endSession(router, queryClient)
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(router.state.location.search).toEqual({ redirect: '/transactions/tx-1' })
  })

  test('on the sign-in page already, leaves the return address as it was', async () => {
    const queryClient = new QueryClient()
    const router = await openAt('/sign-in?redirect=%2Fsettings', queryClient)
    await endSession(router, queryClient)
    expect(router.state.location.search).toEqual({ redirect: '/settings' })
  })
})

// The route's own schema, through the real route tree. matchRoutes rather than load: in Node, a load
// whose validated search differs from the address commits no matches (plan 05's log).
describe("the sign-in page's return address (QR-11)", () => {
  const returnTo = (redirect: string) => {
    const href = `/sign-in?${new URLSearchParams({ redirect })}`
    const router = createAppRouter(
      new QueryClient(),
      createMemoryHistory({ initialEntries: [href] }),
    )
    return router.matchRoutes(router.state.location).at(-1)?.search
  }

  test('keeps a path on this site', () => {
    expect(returnTo('/transactions/tx-1')).toEqual({ redirect: '/transactions/tx-1' })
  })

  test.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)'])(
    'falls back to the dashboard for %s',
    (redirect) => {
      expect(returnTo(redirect)).toEqual({ redirect: '/' })
    },
  )
})
