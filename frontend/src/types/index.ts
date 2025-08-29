/**
 * TrackMap Application Types
 * Core data models for products, pages, events, and properties
 */

// Status types for events
export type EventStatus = 'to_implement' | 'to_test' | 'validated' | 'error'

// Property types
export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * Product Model
 */
export interface Product {
  id: string
  name: string
  slug: string
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
  slug: string
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
 * Property Model (Properties Library)
 */
export interface Property {
  id: string
  product_id: string
  name: string
  type: PropertyType
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
 * Property Value Model (Junction table)
 */
export interface PropertyValue {
  property_id: string
  suggested_value_id: string
  // Relations
  property?: Property
  suggested_value?: SuggestedValue
}

/**
 * Comment Model
 */
export interface Comment {
  id: string
  event_id: string
  content: string
  author?: string
  created_at: string
  // Relations
  event?: Event
}

/**
 * Event History Model
 */
export interface EventHistory {
  id: string
  event_id: string
  field: string
  old_value?: string
  new_value?: string
  author?: string
  created_at: string
  // Relations
  event?: Event
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
  slug?: string
  description?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface CreatePageRequest {
  name: string
  slug?: string
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

export interface CreatePropertyRequest {
  name: string
  type: PropertyType
  description?: string
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {}

export interface CreateSuggestedValueRequest {
  value: string
  is_contextual?: boolean
}

export interface UpdateSuggestedValueRequest extends Partial<CreateSuggestedValueRequest> {}

export interface CreatePropertyValueRequest {
  property_id: string
  suggested_value_id: string
}

export interface DeletePropertyValueRequest {
  property_id: string
  suggested_value_id: string
}

export interface CreateCommentRequest {
  content: string
  author?: string
}

export interface UpdateCommentRequest extends Partial<CreateCommentRequest> {}

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

export interface PropertiesFilter {
  search?: string
  type?: PropertyType[]
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface SuggestedValuesFilter {
  search?: string
  is_contextual?: boolean
  sortBy?: 'value' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface CommentsFilter {
  search?: string
  author?: string
  sortBy?: 'created_at' | 'author'
  sortOrder?: 'asc' | 'desc'
}

export interface EventHistoryFilter {
  field?: string
  author?: string
  date_from?: string
  date_to?: string
  sortBy?: 'created_at' | 'field' | 'author'
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