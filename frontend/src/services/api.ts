/**
 * API Service Layer for TrackMap Application
 * Handles all HTTP requests to the backend API
 */

import type {
  Product,
  Page,
  Event,
  Property,
  SuggestedValue,
  PropertyValue,
  Comment,
  EventHistory,
  ApiResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateEventRequest,
  UpdateEventRequest,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  CreateSuggestedValueRequest,
  UpdateSuggestedValueRequest,
  CreatePropertyValueRequest,
  DeletePropertyValueRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  ProductsFilter,
  PagesFilter,
  EventsFilter,
  PropertiesFilter,
  SuggestedValuesFilter,
  CommentsFilter,
  EventHistoryFilter,
  ProductStats,
  PropertyImpactData,
  SuggestedValueImpactData,
} from '@/types'

// Base API configuration
const API_BASE_URL = '/api'

/**
 * NOTE: transformApiData function removed (P1.4.2 optimization)
 *
 * The backend (Prisma) already returns camelCase data.
 * The previous transformApiData() converted camelCase → snake_case, which was:
 * - Unnecessary (double conversion)
 * - Expensive (deep object traversal on every API call)
 * - Fragile (manual field mapping maintenance)
 *
 * Frontend types now align with backend camelCase convention.
 * No transformation needed - direct passthrough for better performance.
 */

/**
 * Generic API request handler with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      // Try to parse JSON error response first, fallback to text
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: await response.text() }
      }
      
      // Create enhanced error with response data
      const error = new Error(`API Error: ${response.status} - ${errorData.message || 'Unknown error'}`)
      ;(error as any).response = {
        status: response.status,
        data: errorData
      }
      throw error
    }
    
    const jsonData = await response.json()

    // Return data as-is (camelCase from Prisma backend)
    // No transformation needed - backend and frontend use same convention
    return jsonData
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error)
    throw error
  }
}

/**
 * Products API
 */
export const productsApi = {
  // Get all products
  getAll: (filters?: ProductsFilter): Promise<ApiResponse<Product[]>> =>
    apiRequest('/products' + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single product
  getById: (id: string): Promise<ApiResponse<Product>> =>
    apiRequest(`/products/${id}`),

  // Create product
  create: (data: CreateProductRequest): Promise<ApiResponse<Product>> =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update product
  update: (id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>> =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete product
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Get product statistics
  getStats: (id: string): Promise<ApiResponse<ProductStats>> =>
    apiRequest(`/products/${id}/stats`),
}

/**
 * Pages API
 */
export const pagesApi = {
  // Get pages for a product
  getByProduct: (productId: string, filters?: PagesFilter): Promise<ApiResponse<Page[]>> =>
    apiRequest(`/products/${productId}/pages` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single page
  getById: (id: string): Promise<ApiResponse<Page>> =>
    apiRequest(`/pages/${id}`),

  // Get page by product slug and page slug
  getBySlug: (productSlug: string, pageSlug: string): Promise<ApiResponse<Page>> =>
    apiRequest(`/products/${productSlug}/pages/${pageSlug}`),

  // Create page
  create: (productId: string, data: CreatePageRequest): Promise<ApiResponse<Page>> =>
    apiRequest(`/products/${productId}/pages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update page
  update: (id: string, data: UpdatePageRequest): Promise<ApiResponse<Page>> =>
    apiRequest(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete page
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/pages/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Events API
 */
export const eventsApi = {
  // Get events for a page
  getByPage: (pageId: string, filters?: EventsFilter): Promise<ApiResponse<Event[]>> =>
    apiRequest(`/pages/${pageId}/events` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single event
  getById: (id: string): Promise<ApiResponse<Event>> =>
    apiRequest(`/events/${id}`),

  // Create event
  create: (pageId: string, data: CreateEventRequest): Promise<ApiResponse<Event>> =>
    apiRequest(`/pages/${pageId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update event
  update: (id: string, data: UpdateEventRequest): Promise<ApiResponse<Event>> =>
    apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update event status
  updateStatus: (id: string, status: string): Promise<ApiResponse<Event>> =>
    apiRequest(`/events/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Delete event
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/events/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Properties API
 */
export const propertiesApi = {
  // Get properties for a product
  getByProduct: (productId: string, filters?: PropertiesFilter): Promise<ApiResponse<Property[]>> =>
    apiRequest(`/products/${productId}/properties` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single property
  getById: (id: string): Promise<ApiResponse<Property>> =>
    apiRequest(`/properties/${id}`),

  // Create property
  create: (productId: string, data: CreatePropertyRequest): Promise<ApiResponse<Property>> =>
    apiRequest(`/products/${productId}/properties`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update property
  update: (id: string, data: UpdatePropertyRequest): Promise<ApiResponse<Property>> =>
    apiRequest(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Get property deletion impact
  getImpact: (id: string): Promise<ApiResponse<PropertyImpactData>> =>
    apiRequest(`/properties/${id}/impact`),

  // Delete property
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/properties/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Suggested Values API
 */
export const suggestedValuesApi = {
  // Get suggested values for a product
  getByProduct: (productId: string, filters?: SuggestedValuesFilter): Promise<ApiResponse<SuggestedValue[]>> =>
    apiRequest(`/products/${productId}/suggested-values` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single suggested value
  getById: (id: string): Promise<ApiResponse<SuggestedValue>> =>
    apiRequest(`/suggested-values/${id}`),

  // Create suggested value
  create: (productId: string, data: CreateSuggestedValueRequest): Promise<ApiResponse<SuggestedValue>> =>
    apiRequest(`/products/${productId}/suggested-values`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update suggested value
  update: (id: string, data: UpdateSuggestedValueRequest): Promise<ApiResponse<SuggestedValue>> =>
    apiRequest(`/suggested-values/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Merge suggested values - keep target, remove source
  merge: (sourceId: string, targetId: string): Promise<ApiResponse<any>> =>
    apiRequest(`/suggested-values/${sourceId}/merge/${targetId}`, {
      method: 'POST',
    }),

  // Get suggested value deletion impact
  getImpact: (id: string): Promise<ApiResponse<SuggestedValueImpactData>> =>
    apiRequest(`/suggested-values/${id}/impact`),

  // Delete suggested value
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/suggested-values/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Property Values API (Junction table)
 */
export const propertyValuesApi = {
  // Get suggested values for a specific property
  getByProperty: (propertyId: string): Promise<ApiResponse<PropertyValue[]>> =>
    apiRequest(`/properties/${propertyId}/suggested-values`),

  // Get properties that use a specific suggested value
  getBySuggestedValue: (suggestedValueId: string): Promise<ApiResponse<PropertyValue[]>> =>
    apiRequest(`/suggested-values/${suggestedValueId}/properties`),

  // Associate a property with a suggested value
  create: (data: CreatePropertyValueRequest): Promise<ApiResponse<PropertyValue>> =>
    apiRequest(`/properties/${data.property_id}/suggested-values`, {
      method: 'POST',
      body: JSON.stringify({ suggested_value_id: data.suggested_value_id }),
    }),

  // Remove association between property and suggested value
  delete: (data: DeletePropertyValueRequest): Promise<ApiResponse<void>> =>
    apiRequest(`/properties/${data.property_id}/suggested-values/${data.suggested_value_id}`, {
      method: 'DELETE',
    }),
}

/**
 * Comments API
 */
export const commentsApi = {
  // Get comments for an event
  getByEvent: (eventId: string, filters?: CommentsFilter): Promise<ApiResponse<Comment[]>> =>
    apiRequest(`/events/${eventId}/comments` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single comment
  getById: (id: string): Promise<ApiResponse<Comment>> =>
    apiRequest(`/comments/${id}`),

  // Create comment
  create: (eventId: string, data: CreateCommentRequest): Promise<ApiResponse<Comment>> =>
    apiRequest(`/events/${eventId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update comment
  update: (id: string, data: UpdateCommentRequest): Promise<ApiResponse<Comment>> =>
    apiRequest(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete comment
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/comments/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Event History API (Read-only - automatically generated)
 */
export const eventHistoryApi = {
  // Get history for an event
  getByEvent: (eventId: string, filters?: EventHistoryFilter): Promise<ApiResponse<EventHistory[]>> =>
    apiRequest(`/events/${eventId}/history` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single history entry
  getById: (id: string): Promise<ApiResponse<EventHistory>> =>
    apiRequest(`/event-history/${id}`),
}

