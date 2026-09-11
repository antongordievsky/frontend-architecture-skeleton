import { expect, test } from '@playwright/test'

// D-14: the gallery's contract. A story id that names no story fails the mount, so a renamed or misspelled
// story fails its test instead of screenshotting an empty page.
test('an unknown story fails the mount', async ({ mount }) => {
  await expect(mount('ui/Nothing/Here')).rejects.toThrow(/unknown story: ui\/Nothing\/Here/)
})
