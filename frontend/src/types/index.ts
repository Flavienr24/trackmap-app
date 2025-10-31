/**
 * TrackMap Application Types
 * Core data models for products, pages, events, and properties
 */

// Status types for events
export type EventStatus = 'to_implement' | 'to_test' | 'validated' | 'error'

// Interaction types for canonical event definitions
export type UserInteractionType = 'click' | 'page_load' | 'interaction' | 'form_submit' | 'scroll' | 'other'

// Property types
export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * Product Model
 */
export interface Product {
  id: string
  name: string
  url?: string
  description?: string
  created_at: string
  updated_at: string
  // Computed fields
  pages_count?: number
  events_count?: number
  health_score?: number
  // Relations
  pages?: Page[]
}

/**
 * Page Model  
 */
export interface Page {
  id: string
  productId: string
  name: string
  slug: string
  url?: string
  created_at: string
  updated_at: string
  // Computed fields
  events_count?: number
  product?: Product
  events?: Event[]
}

/**
 * Screenshot Model
 */
export interface Screenshot {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  bytes: number
  created_at: string
  thumbnail_url?: string
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
  properties: Record<string, any>
  screenshots?: Screenshot[]
  createdAt: string
  updatedAt: string
  eventDefinitionId?: string
  // Relations
  page?: Page
  eventDefinition?: EventDefinition
}

/**
 * Event Definition Model (Canonical glossary entry)
 */
export interface EventDefinition {
  id: string
  productId: string
  name: string
  description: string
  userInteractionType: UserInteractionType
  createdAt: string
  updatedAt: string
  // Relations
  product?: Product
  events?: Event[]
  _count?: {
    events: number
  }
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
  productId: string
  value: string
  isContextual: boolean
  createdAt: string
  updatedAt: string
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
 * Common Property Model (Default property-value pairs for events)
 */
export interface CommonProperty {
  id: string
  productId: string
  propertyId: string
  suggestedValueId: string
  createdAt: string
  updatedAt: string
  // Relations
  product?: Product
  property?: Property
  suggestedValue?: SuggestedValue
}

/**
 * Event Conflict Model (Detected conflicts with common properties)
 */
export interface EventConflict {
  eventId: string
  eventName: string
  propertyKey: string
  currentValue: any
  expectedValue: any
  commonPropertyId: string
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

export interface EventDefinitionHistory {
  id: string
  eventDefinitionId: string
  field: string
  oldValue?: string
  newValue?: string
  author?: string
  createdAt: string
}

export interface EventDefinitionStats {
  totalDefinitions: number
  totalEvents: number
  avgEventsPerDefinition: number
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
  url?: string
  description?: string
}

export interface UpdateProductRequest {
  name?: string
  url?: string
  description?: string
}

export interface CreatePageRequest {
  name: string
  slug?: string
  url?: string
}

export interface UpdatePageRequest extends Partial<CreatePageRequest> {}

export interface CreateEventRequest {
  name: string
  status?: EventStatus
  properties?: Record<string, any>
  description?: string
  userInteractionType?: UserInteractionType
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

export interface CreateEventDefinitionRequest {
  name: string
  description?: string
  userInteractionType?: UserInteractionType
}

export interface UpdateEventDefinitionRequest extends Partial<CreateEventDefinitionRequest> {}

export interface CreateSuggestedValueRequest {
  value: string
  isContextual?: boolean
}

export interface UpdateSuggestedValueRequest extends Partial<CreateSuggestedValueRequest> {}

export interface SuggestedValueConflictData {
  existingValue: {
    id: string
    value: string
    isContextual: boolean
  }
  mergeProposal: {
    keepValue: string
    removeValue: string
  }
}

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

export interface CreateCommonPropertyRequest {
  propertyId: string
  suggestedValueId: string
}

export interface UpdateCommonPropertyRequest {
  propertyId?: string       // Optional - allows changing the property key
  suggestedValueId: string
}

/**
 * Impact Analysis Types
 */
export interface PropertyImpactData {
  affectedEventsCount: number
  affectedEvents: Array<{
    id: string
    name: string
    page: string
    pageSlug: string
    propertyValue: any
  }>
}

export interface SuggestedValueImpactData {
  affectedEventsCount: number
  affectedEvents: Array<{
    id: string
    name: string
    page: string
    pageSlug: string
    matchingProperties: Array<{
      key: string
      value: any
    }>
  }>
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

export interface EventDefinitionsFilter {
  search?: string
  includeStats?: boolean
}

export interface PropertiesFilter {
  search?: string
  type?: PropertyType[]
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
  lite?: 'true' | 'false'
}

export interface SuggestedValuesFilter {
  search?: string
  isContextual?: boolean
  sortBy?: 'value' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
  lite?: 'true' | 'false'
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
