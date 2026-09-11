import { expect, test } from '@playwright/test'

// D-07, QR-12: the link's behaviour comes from React Aria, its look from the tokens (D-28). The screenshots are
// compared with zero tolerance, in each engine and theme (D-14).

test('the pointer, and a focus ring from the keyboard', async ({ mount, page }) => {
  const link = (await mount('ui/Link/Default')).getByRole('link', { name: 'Transactions' })
  await expect(link).toHaveAttribute('href', '/transactions')
  await expect(link).toHaveCSS('cursor', 'pointer')
  await page.keyboard.press('Tab')
  await expect(link).toBeFocused()
  await expect(link).toHaveCSS('outline-style', 'solid')
})

test('the current page is announced', async ({ mount }) => {
  const link = (await mount('ui/Link/Current')).getByRole('link', { name: 'Transactions' })
  await expect(link).toHaveAttribute('aria-current', 'page')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`the ${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test('looks as approved: at rest, focused, current', async ({ mount, page }) => {
      const link = await mount('ui/Link/Default')
      await expect(link).toHaveScreenshot(`default-${colorScheme}.png`)
      await page.keyboard.press('Tab')
      await expect(link).toHaveScreenshot(`default-focused-${colorScheme}.png`)
      await expect(await mount('ui/Link/Current')).toHaveScreenshot(`current-${colorScheme}.png`)
    })
  })
}
