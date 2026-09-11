import { expect, test } from '@playwright/test'

// D-07, QR-12: the button's behaviour comes from React Aria, its look from the tokens (D-28). The screenshots
// are compared with zero tolerance, in each engine (D-14). The product ships one theme, so each state has one
// baseline (D-28, amended 2026-09-12).

test('a press counts by pointer, Enter and Space', async ({ mount }) => {
  const story = await mount('ui/Button/Pressable')
  const button = story.getByRole('button', { name: 'Try again' })
  await button.click()
  await button.press('Enter')
  await button.press('Space')
  await expect(story.getByTestId('presses')).toHaveValue('3')
})

test('the pointer, and a focus ring from the keyboard', async ({ mount, page }) => {
  const button = (await mount('ui/Button/Primary')).getByRole('button', { name: 'Try again' })
  await expect(button).toHaveCSS('cursor', 'pointer')
  await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
  await expect(button).toHaveCSS('outline-style', 'solid')
})

test('a disabled button is disabled, and says so to the pointer', async ({ mount }) => {
  const button = (await mount('ui/Button/Disabled')).getByRole('button', { name: 'Try again' })
  await expect(button).toBeDisabled()
  await expect(button).toHaveCSS('cursor', 'not-allowed')
})

test('looks as approved: at rest, focused, disabled', async ({ mount, page }) => {
  const primary = await mount('ui/Button/Primary')
  await expect(primary).toHaveScreenshot('primary.png')
  await page.keyboard.press('Tab')
  await expect(primary).toHaveScreenshot('primary-focused.png')
  await expect(await mount('ui/Button/Disabled')).toHaveScreenshot('disabled.png')
})
