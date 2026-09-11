import { defineConfig } from 'orval'

// D-24 (amended), D-03: types, Zod Mini schemas and calls through our transport. No mocks: the stand-in
// is hand-written over a seeded dataset (D-04). The generated hooks go unused; adapters build on the
// generated query keys and calls.
export default defineConfig({
  transactions: {
    input: './contract/openapi.yaml',
    output: {
      target: './src/api/generated/api.ts',
      schemas: { path: './src/api/generated/model', type: 'zod' },
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: './src/api/transport.ts', name: 'transport' },
        fetch: { forceSuccessResponse: true },
        zod: { variant: 'mini' },
      },
    },
  },
})
