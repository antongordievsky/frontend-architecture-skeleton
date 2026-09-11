import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// QR-22, D-28: the supported browsers, declared once, for scripts and stylesheets alike. They are Vite 8.3's
// default ('baseline-widely-available'), written out so that an upgrade cannot move the floor unnoticed.
const BROWSERS = ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']

// https://vite.dev/config/
export default defineConfig({
  build: { target: BROWSERS, cssTarget: BROWSERS },
  plugins: [
    // D-05: writes the route tree from src/routes and splits each route's screen into its own chunk.
    // It must come before React's plugin. Its options live in tsr.config.json, which `tsr generate`
    // reads as well, so the drift gate and the build write the same tree.
    tanstackRouter({ target: 'react' }),
    react(),
    // D-13: the official React Compiler. "all_errors" turns a component it cannot optimise into a
    // build error instead of a silently unoptimised component — e.g. a BigInt literal inside a
    // component, which belongs in the domain anyway (QR-2).
    babel({ presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })] }),
  ],
  // D-16: `@/` means src/, read from tsconfig's `paths`, so the alias has one definition.
  resolve: { tsconfigPaths: true },
  // D-09: Vitest runs logic in Node, with no page; anything that renders is Playwright's.
  test: { include: ['src/**/*.test.ts', 'mock/**/*.test.ts'] },
})
