import { expect, test } from '@playwright/test'

// D-05, D-07: a link built from the router's typed address and the kit's Link. The router marks the current page,
// and a press moves between pages without leaving the app.
test('the router marks the current page, and a press navigates', async ({ mount }) => {
  const story = await mount('components/RouterLink/Navigation')
  const dashboard = story.getByRole('link', { name: 'Dashboard' })
  const transactions = story.getByRole('link', { name: 'Transactions' })
  await expect(transactions).toHaveAttribute('href', '/transactions')
  await expect(transactions).toHaveAttribute('aria-current', 'page')
  await expect(dashboard).not.toHaveAttribute('aria-current', 'page')

  await dashboard.click()
  await expect(dashboard).toHaveAttribute('aria-current', 'page')
  await expect(transactions).not.toHaveAttribute('aria-current', 'page')
})
