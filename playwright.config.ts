import { defineConfig, devices } from '@playwright/test'

// D-14: each part's stories, mounted in Playwright's gallery on our own dev server, are its component tests
// and its screenshots, in the three engines of the browser tests (D-09). They run in the browser service,
// `docker compose run --rm browser`: the baselines are Linux images, compared only where they were made.
const gallery = 'http://localhost:5173/playwright/gallery/index.html'

export default defineConfig({
  testDir: '.',
  testMatch: ['src/**/*.spec.ts', 'playwright/**/*.spec.ts'],
  forbidOnly: true,
  reporter: 'list',
  // Zero tolerance: the default (0.2) let a colour change as large as blue → violet through (D-14).
  expect: { toHaveScreenshot: { threshold: 0, maxDiffPixels: 0 } },
  // Beside the part, one image per engine and platform.
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/__screenshots__/{arg}-{projectName}-{platform}{ext}',
  use: { baseURL: gallery, serviceWorkers: 'block' },
  webServer: {
    // --force: pre-bundle afresh on every run, so a cache made before a story existed is never reused.
    command: 'node_modules/.bin/vite --port 5173 --strictPort --force',
    url: gallery,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
})
