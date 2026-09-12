import { expect, test } from '@playwright/test'

// D-07, D-14, QR-6, QR-12: the table's behaviour comes from React Aria, its look from the tokens (D-28).
// What matters here is what a screen reader and a keyboard get: a real table with a named row header, the
// sort state on the column, and only a screenful of rows in the DOM.

test('is a table, with its columns named', async ({ mount }) => {
  const table = (await mount('ui/Table/Default')).getByRole('grid')
  await expect(table).toHaveAttribute('aria-label', 'Transactions')
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(table.getByRole('row')).not.toHaveCount(0)
})

// React Aria writes aria-sort itself (useTableColumnHeader, measured in 1.21). This asserts that it does,
// so an upgrade that stopped doing it would fail here rather than silently losing the announcement.
test('the sorted column announces its direction, and the others do not', async ({ mount }) => {
  const table = (await mount('ui/Table/Sorted')).getByRole('grid')
  await expect(table.getByRole('columnheader', { name: 'Value' })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await expect(table.getByRole('columnheader', { name: 'Date' })).toHaveAttribute(
    'aria-sort',
    'none',
  )
  await expect(table.getByRole('columnheader', { name: 'Kind' })).not.toHaveAttribute(
    'aria-sort',
    /.*/,
  )
})

test('a sortable heading takes the pointer; a plain one does not', async ({ mount }) => {
  const table = (await mount('ui/Table/Default')).getByRole('grid')
  await expect(table.getByRole('columnheader', { name: 'Date' })).toHaveCSS('cursor', 'pointer')
  await expect(table.getByRole('columnheader', { name: 'Kind' })).not.toHaveCSS('cursor', 'pointer')
})

test('sorting is reachable by the keyboard alone', async ({ mount, page }) => {
  const table = (await mount('ui/Table/Sorted')).getByRole('grid')
  const value = table.getByRole('columnheader', { name: 'Value' })
  await expect(value).toHaveAttribute('aria-sort', 'descending')
  // Into the table, then along the header to Value, then turn the sort around.
  await page.keyboard.press('Tab')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(value).toHaveAttribute('aria-sort', 'ascending')
})

// QR-6: ten thousand rows, a screenful in the DOM. Two things have to hold together — few rows rendered,
// and the whole set still accounted for — because either alone can be true while the table is broken.
//
// Not toBeVisible() on a row: the virtualizer gives a row its geometry through a wrapper, and the element
// with role="row" computes to 1px, which Playwright calls hidden. Measured, after that assertion failed in
// all three engines on a table that was in fact working (scrollHeight 440_040 for 10_000 rows).
test('ten thousand rows reach the screen a screenful at a time', async ({ mount, page }) => {
  const table = (await mount('ui/Table/ManyRows')).getByRole('grid')
  await expect(table.getByRole('rowheader').first()).toHaveText(/2026-08-\d\d/)
  const rows = await table.getByRole('row').count()
  expect(rows).toBeLessThan(100)
  expect(rows).toBeGreaterThan(1)
  // The scrollable content covers the whole set, so nothing was silently dropped from the collection.
  const { scrollHeight, clientHeight } = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]')
    return { scrollHeight: grid?.scrollHeight ?? 0, clientHeight: grid?.clientHeight ?? 0 }
  })
  expect(scrollHeight).toBeGreaterThan(clientHeight * 50)
})

test('an empty table says so in the page’s own words', async ({ mount }) => {
  const table = (await mount('ui/Table/Empty')).getByRole('grid')
  await expect(table.getByText('No transactions yet.')).toBeVisible()
})

test('looks as approved: at rest, sorted, empty', async ({ mount }) => {
  await expect(await mount('ui/Table/Default')).toHaveScreenshot('default.png')
  await expect(await mount('ui/Table/Sorted')).toHaveScreenshot('sorted.png')
  await expect(await mount('ui/Table/Empty')).toHaveScreenshot('empty.png')
})
