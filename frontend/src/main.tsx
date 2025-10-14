import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

// Configure React Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5min
      gcTime: 10 * 60 * 1000, // 10 minutes - cached for 10min (renamed from cacheTime in v5)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 2, // Retry failed requests 2 times
      retryDelay: 1000 // Wait 1s between retries
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)