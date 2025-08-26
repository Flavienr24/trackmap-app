/**
 * TrackMap Application Types
 * Core data models for products, pages, events, and variables
 */

// Status types for events
export type EventStatus = 'to_implement' | 'to_test' | 'validated' | 'error'

// Variable types
export type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * Product Model
 */
export interface Product {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  // Computed fields
  pages_count?: number
  events_count?: number
  health_score?: number
}

/**
 * Page Model  
 */
export interface Page {
  id: string
  product_id: string
  name: string
  url: string
  created_at: string
  updated_at: string
  // Computed fields
  events_count?: number
  product?: Product
}

/**
 * Event Model
 */
export interface Event {
  id: string
  page_id: string
  name: string
  status: EventStatus
  test_date?: string
  variables: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  page?: Page
}

/**
 * Variable Model (Variables Library)
 */
export interface Variable {
  id: string
  product_id: string
  name: string
  type: VariableType
  description?: string
  created_at: string
  updated_at: string
}

/**
 * Suggested Value Model
 */
export interface SuggestedValue {
  id: string
  product_id: string
  value: string
  is_contextual: boolean
  created_at: string
  updated_at: string
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Form Types
 */
export interface CreateProductRequest {
  name: string
  description?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface CreatePageRequest {
  name: string
  url: string
}

export interface UpdatePageRequest extends Partial<CreatePageRequest> {}

export interface CreateEventRequest {
  name: string
  status?: EventStatus
  variables?: Record<string, any>
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  test_date?: string
}

/**
 * Filter and Search Types
 */
export interface ProductsFilter {
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface PagesFilter {
  search?: string
  has_events?: boolean
  sortBy?: 'name' | 'created_at' | 'events_count'
  sortOrder?: 'asc' | 'desc'
}

export interface EventsFilter {
  search?: string
  status?: EventStatus[]
  modified_since?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Statistics Types
 */
export interface ProductStats {
  total_pages: number
  total_events: number
  events_by_status: Record<EventStatus, number>
  health_score: number
  last_updated: string
}