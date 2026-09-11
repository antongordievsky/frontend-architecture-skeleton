import { expect, test } from '@playwright/test'

// D-07, QR-12: the field's behaviour comes from React Aria, its look from the tokens (D-28, D-29). What matters
// here is that the label, the description and the error reach the input, because that is what a screen reader
// reads out. The screenshots are compared with zero tolerance, in each engine (D-14).

test('the label names the input, and typing reaches it', async ({ mount }) => {
  const input = (await mount('ui/TextField/Default')).getByLabel('Email')
  await input.fill('taxpayer@example.com')
  await expect(input).toHaveValue('taxpayer@example.com')
})

test('a description is announced with the field', async ({ mount }) => {
  const input = (await mount('ui/TextField/Described')).getByLabel('Email')
  await expect(input).toHaveAccessibleDescription('We use it to sign you in, nothing else.')
})

test('an invalid field says so, and its message is what the field announces', async ({ mount }) => {
  const input = (await mount('ui/TextField/Invalid')).getByLabel('Email')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAccessibleDescription('Enter an email address.')
})

test('a disabled field is disabled, and says so to the pointer', async ({ mount }) => {
  const input = (await mount('ui/TextField/Disabled')).getByLabel('Email')
  await expect(input).toBeDisabled()
  await expect(input).toHaveCSS('cursor', 'not-allowed')
})

test('the caret, and a focus ring from the keyboard', async ({ mount, page }) => {
  const input = (await mount('ui/TextField/Default')).getByLabel('Email')
  await expect(input).toHaveCSS('cursor', 'text')
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()
  await expect(input).toHaveCSS('outline-style', 'solid')
})

test('looks as approved: at rest, focused, described, invalid, disabled', async ({
  mount,
  page,
}) => {
  const field = await mount('ui/TextField/Default')
  await expect(field).toHaveScreenshot('default.png')
  await page.keyboard.press('Tab')
  await expect(field).toHaveScreenshot('default-focused.png')
  await expect(await mount('ui/TextField/Described')).toHaveScreenshot('described.png')
  await expect(await mount('ui/TextField/Invalid')).toHaveScreenshot('invalid.png')
  await expect(await mount('ui/TextField/Disabled')).toHaveScreenshot('disabled.png')
})
