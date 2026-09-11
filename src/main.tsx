import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from '@/api/queryClient.ts'
import './index.css'
import { createAppRouter, endSession } from './router.ts'

// The query client signals a 401; the router answers it. Each needs the other, so the signal is a
// closure that runs only after both exist.
const queryClient = createQueryClient({
  onUnauthorized: () => void endSession(router, queryClient),
})
const router = createAppRouter(queryClient)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing the #root element')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
