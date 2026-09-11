import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
