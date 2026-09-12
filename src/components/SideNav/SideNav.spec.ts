import { expect, test } from '@playwright/test'

// D-16, QR-12: the navigation is a named landmark, so someone using a screen reader can jump to it and knows
// which navigation they have reached. Exactly one row is the current page, and the keyboard reaches every row.

test('the navigation is a landmark with a name', async ({ mount }) => {
  const story = await mount('components/SideNav/Main')
  await expect(story.getByRole('navigation', { name: 'Main' })).toBeVisible()
})

test('exactly one row is the current page, and it moves when followed', async ({ mount }) => {
  const story = await mount('components/SideNav/Main')
  const current = story.getByRole('link').and(story.locator('[aria-current="page"]'))
  await expect(current).toHaveCount(1)
  await expect(current).toHaveText('Transactions')
  // Named on purpose: '/' is a prefix of every address, so the dashboard is the row that would wrongly light up
  // if the current page were ever decided by the address as text rather than by the route the router matched.
  await expect(story.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
    'aria-current',
    'page',
  )

  await story.getByRole('link', { name: 'Settings' }).press('Enter')
  await expect(current).toHaveCount(1)
  await expect(current).toHaveText('Settings')
})

test('the keyboard reaches every row, in the order they are read', async ({ mount, page }) => {
  const story = await mount('components/SideNav/Main')
  for (const name of ['Dashboard', 'Transactions', 'Settings']) {
    await page.keyboard.press('Tab')
    await expect(story.getByRole('link', { name })).toBeFocused()
  }
})

test('looks as approved', async ({ mount }) => {
  await expect(await mount('components/SideNav/Main')).toHaveScreenshot('main.png')
})
