/**
 * Import Context Types
 *
 * Type definitions for the import context API response.
 * These types mirror the backend Zod schema for type safety.
 *
 * TODO: Auto-generate from backend schema using zod-to-ts
 */

export interface AssociatedValue {
  id: string
  value: string
}

export interface PropertyContext {
  id: string
  name: string
  associatedValues: AssociatedValue[]
}

export interface SuggestedValueContext {
  id: string
  value: string
  isContextual: boolean
}

export interface PaginationMetadata {
  limit: number
  offset: number
  totals: {
    events: number
    properties: number
    suggestedValues: number
  }
  hasMore: {
    events: boolean
    properties: boolean
    suggestedValues: boolean
  }
}

export interface ImportContextResponse {
  eventNames: string[]
  properties: PropertyContext[]
  suggestedValues: SuggestedValueContext[]
  pagination: PaginationMetadata
}

// Alias for convenience
export type ImportContext = ImportContextResponse
