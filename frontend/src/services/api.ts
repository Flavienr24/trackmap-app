/**
 * API Service Layer for TrackMap Application
 * Handles all HTTP requests to the backend API
 */

import type {
  Product,
  Page,
  Event,
  Variable,
  SuggestedValue,
  VariableValue,
  Comment,
  EventHistory,
  ApiResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateEventRequest,
  UpdateEventRequest,
  CreateVariableRequest,
  UpdateVariableRequest,
  CreateSuggestedValueRequest,
  UpdateSuggestedValueRequest,
  CreateVariableValueRequest,
  DeleteVariableValueRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  ProductsFilter,
  PagesFilter,
  EventsFilter,
  VariablesFilter,
  SuggestedValuesFilter,
  CommentsFilter,
  EventHistoryFilter,
  ProductStats,
} from '@/types'

// Base API configuration
const API_BASE_URL = '/api'

/**
 * Transform API response data from camelCase to snake_case
 * Maps backend field names to frontend interface expectations
 */
function transformApiData(data: any): any {
  if (!data) return data
  
  if (Array.isArray(data)) {
    return data.map(item => transformApiData(item))
  }
  
  if (typeof data === 'object') {
    const transformed: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      let newKey = key
      
      // Transform common field mappings
      if (key === 'createdAt') newKey = 'created_at'
      if (key === 'updatedAt') newKey = 'updated_at'
      if (key === 'productId') newKey = 'product_id'
      if (key === 'pageId') newKey = 'page_id'
      if (key === 'eventId') newKey = 'event_id'
      if (key === 'variableId') newKey = 'variable_id'
      if (key === 'suggestedValueId') newKey = 'suggested_value_id'
      if (key === 'testDate') newKey = 'test_date'
      if (key === 'isContextual') newKey = 'is_contextual'
      if (key === 'oldValue') newKey = 'old_value'
      if (key === 'newValue') newKey = 'new_value'
      
      transformed[newKey] = transformApiData(value)
    }
    
    return transformed
  }
  
  return data
}

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
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }
    
    const jsonData = await response.json()
    
    // Transform the response data to match frontend interfaces
    if (jsonData.data) {
      jsonData.data = transformApiData(jsonData.data)
    } else {
      return transformApiData(jsonData)
    }
    
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
 * Variables API
 */
export const variablesApi = {
  // Get variables for a product
  getByProduct: (productId: string, filters?: VariablesFilter): Promise<ApiResponse<Variable[]>> =>
    apiRequest(`/products/${productId}/variables` + (filters ? `?${new URLSearchParams(filters as any)}` : '')),

  // Get single variable
  getById: (id: string): Promise<ApiResponse<Variable>> =>
    apiRequest(`/variables/${id}`),

  // Create variable
  create: (productId: string, data: CreateVariableRequest): Promise<ApiResponse<Variable>> =>
    apiRequest(`/products/${productId}/variables`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update variable
  update: (id: string, data: UpdateVariableRequest): Promise<ApiResponse<Variable>> =>
    apiRequest(`/variables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete variable
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/variables/${id}`, {
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

  // Delete suggested value
  delete: (id: string): Promise<ApiResponse<void>> =>
    apiRequest(`/suggested-values/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * Variable Values API (Junction table)
 */
export const variableValuesApi = {
  // Get suggested values for a specific variable
  getByVariable: (variableId: string): Promise<ApiResponse<VariableValue[]>> =>
    apiRequest(`/variables/${variableId}/suggested-values`),

  // Get variables that use a specific suggested value
  getBySuggestedValue: (suggestedValueId: string): Promise<ApiResponse<VariableValue[]>> =>
    apiRequest(`/suggested-values/${suggestedValueId}/variables`),

  // Associate a variable with a suggested value
  create: (data: CreateVariableValueRequest): Promise<ApiResponse<VariableValue>> =>
    apiRequest(`/variables/${data.variable_id}/suggested-values`, {
      method: 'POST',
      body: JSON.stringify({ suggested_value_id: data.suggested_value_id }),
    }),

  // Remove association between variable and suggested value
  delete: (data: DeleteVariableValueRequest): Promise<ApiResponse<void>> =>
    apiRequest(`/variables/${data.variable_id}/suggested-values/${data.suggested_value_id}`, {
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

