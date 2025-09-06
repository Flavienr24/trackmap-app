import type { SortOption } from '@/components/molecules/SortSelector'
import type { EventStatus } from '@/types'

/**
 * Sort data based on the selected sort option
 */
export function sortData<T extends Record<string, any>>(
  data: T[],
  sortOption: SortOption
): T[] {
  const sortedData = [...data]

  switch (sortOption) {
    case 'created_desc':
      return sortedData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    
    case 'created_asc':
      return sortedData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    
    case 'updated_desc':
      return sortedData.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    
    case 'updated_asc':
      return sortedData.sort((a, b) => 
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      )
    
    case 'name_asc':
      return sortedData.sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', 'fr-FR')
      )
    
    case 'name_desc':
      return sortedData.sort((a, b) => 
        (b.name || '').localeCompare(a.name || '', 'fr-FR')
      )
    
    case 'status_grouped':
      return sortedData.sort((a, b) => {
        // Define status order for grouping
        const statusOrder: Record<string, number> = {
          'to_implement': 0,
          'TO_IMPLEMENT': 0,
          'to_test': 1,
          'TO_TEST': 1,
          'validated': 2,
          'VALIDATED': 2,
          'error': 3,
          'ERROR': 3
        }
        
        const statusA = statusOrder[a.status as string] ?? 999
        const statusB = statusOrder[b.status as string] ?? 999
        
        // Primary sort: by status order
        if (statusA !== statusB) {
          return statusA - statusB
        }
        
        // Secondary sort: if same status, sort by created date desc (most recent first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    
    default:
      return sortedData
  }
}

/**
 * Get the default sort option for a specific table/context
 */
export function getDefaultSortOption(context?: string): SortOption {
  // You can customize default sort per context if needed
  switch (context) {
    case 'events':
      return 'created_desc'
    case 'products':
      return 'created_desc'
    case 'pages':
      return 'created_desc'
    default:
      return 'created_desc'
  }
}

/**
 * Save sort preference to session storage
 */
export function saveSortPreference(context: string, sortOption: SortOption): void {
  try {
    sessionStorage.setItem(`sort_${context}`, sortOption)
  } catch (error) {
    console.warn('Failed to save sort preference:', error)
  }
}

/**
 * Load sort preference from session storage
 */
export function loadSortPreference(context: string): SortOption | null {
  try {
    const saved = sessionStorage.getItem(`sort_${context}`)
    return saved as SortOption || null
  } catch (error) {
    console.warn('Failed to load sort preference:', error)
    return null
  }
}