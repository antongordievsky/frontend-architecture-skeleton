import { expect, test } from '@playwright/test'

// D-05, D-07: a link built from the router's typed address and the kit's Link. The router marks the current page,
// and a press moves between pages without leaving the app.
test('the router marks the current page, and a press navigates', async ({ mount }) => {
  const story = await mount('components/RouterLink/Navigation')
  const dashboard = story.getByRole('link', { name: 'Dashboard' })
  const transactions = story.getByRole('link', { name: 'Transactions' })
  // The address carries the list's question (D-06), so the href is the path plus that search. Asserted as
  // a pattern rather than a literal: the default sort belongs to api/transactions.ts, not to this test.
  await expect(transactions).toHaveAttribute('href', /^\/transactions\?sort=occurredAt(%3A|:)desc$/)
  await expect(transactions).toHaveAttribute('aria-current', 'page')
  await expect(dashboard).not.toHaveAttribute('aria-current', 'page')

  await dashboard.click()
  await expect(dashboard).toHaveAttribute('aria-current', 'page')
  await expect(transactions).not.toHaveAttribute('aria-current', 'page')
})

// Without the router's navigate, React Aria follows the link itself and the page loads again (plan 06). The
// story's router keeps its history in memory, so a move within the app leaves the gallery's address alone; a
// page load goes to the link's address instead, where the app itself renders a Dashboard link of its own.
test('Enter moves within the app, as a click does', async ({ mount, page }) => {
  const story = await mount('components/RouterLink/Navigation')
  const dashboard = story.getByRole('link', { name: 'Dashboard' })
  await dashboard.press('Enter')
  await expect(dashboard).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveURL(/\/playwright\/gallery\/index\.html$/)
})
