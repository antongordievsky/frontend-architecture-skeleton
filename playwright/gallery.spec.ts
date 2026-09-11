import { expect, test } from '@playwright/test'

// D-14: the gallery's contract. A story id that names no story fails the mount, so a renamed or misspelled
// story fails its test instead of screenshotting an empty page.
test('an unknown story fails the mount', async ({ mount }) => {
  await expect(mount('ui/Nothing/Here')).rejects.toThrow(/unknown story: ui\/Nothing\/Here/)
})

// D-28, amended 2026-09-12: the product ships one theme. A browser asking for a dark one is answered with the
// same surface, because there is no dark set to find. The colour is written out here on purpose: this test
// exists to fail if a dark block ever returns unnoticed.
test.describe('a browser that asks for a dark theme', () => {
  test.use({ colorScheme: 'dark' })

  test('is answered with the one theme the product has', async ({ mount, page }) => {
    await mount('ui/Button/Primary')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 245, 249)')
  })
})
