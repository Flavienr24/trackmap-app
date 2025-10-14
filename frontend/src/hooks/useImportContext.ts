/**
 * useImportContext Hook
 *
 * React Query hook to fetch and cache import context for event parsing.
 * Provides automatic caching, deduplication, and error handling.
 */

import { useQuery } from '@tanstack/react-query'
import { importContextApi } from '@/services/api'
import type { ImportContext } from '@/types/importContext'

interface UseImportContextOptions {
  limit?: number
  enabled?: boolean
}

/**
 * Hook to fetch import context for bulk event import
 *
 * Features:
 * - Automatic caching (5min stale time, 10min gc time)
 * - Deduplication (multiple calls with same productId use same request)
 * - Automatic retry on failure (2 retries with 1s delay)
 * - Warning log if data is truncated due to pagination
 *
 * @param productId - Product ID to fetch context for
 * @param options - Optional limit and enabled flag
 * @returns React Query result with data, loading, and error states
 */
export function useImportContext(
  productId: string | undefined,
  options: UseImportContextOptions = {}
) {
  const { limit = 100, enabled = true } = options

  return useQuery({
    queryKey: ['importContext', productId, limit],
    queryFn: async () => {
      const response = await importContextApi.get(productId!, { limit })
      return response.data
    },
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    select: (data: ImportContext) => {
      // Log warning if data is truncated
      const { hasMore } = data.pagination
      if (hasMore.events || hasMore.properties || hasMore.suggestedValues) {
        console.warn(
          'Import context truncated due to pagination limits:',
          {
            eventsMore: hasMore.events,
            propertiesMore: hasMore.properties,
            suggestedValuesMore: hasMore.suggestedValues,
            totals: data.pagination.totals
          }
        )
      }
      return data
    }
  })
}
