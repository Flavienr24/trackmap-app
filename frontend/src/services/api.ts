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
    
    return await response.json()
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

/**
 * Mock data for development
 * TODO: Remove when backend is ready
 */
export const mockData = {
  products: [
    {
      id: '1',
      name: 'MyServier',
      description: 'Content hub for health care professionals',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z',
      pages_count: 8,
      events_count: 24,
      health_score: 85,
    },
    {
      id: '2', 
      name: 'My Health Partner',
      description: 'Content hub for patients and care givers',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-25T16:45:00Z',
      pages_count: 12,
      events_count: 18,
      health_score: 72,
    },
  ] as Product[],

  pages: [
    {
      id: '1',
      product_id: '1',
      name: 'Homepage',
      url: 'https://mysiervier.pt/',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-20T11:00:00Z',
      events_count: 5,
    },
    {
      id: '2',
      product_id: '1',
      name: 'Events',
      url: 'https://mysiervier.pt/events/*',
      created_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-22T09:15:00Z',
      events_count: 8,
    },
  ] as Page[],

  events: [
    {
      id: '1',
      page_id: '1',
      name: 'page_view',
      status: 'validated' as const,
      variables: {
        page_name: 'homepage',
        page_category: 'landing'
      },
      created_at: '2024-01-15T10:45:00Z',
      updated_at: '2024-01-18T14:20:00Z',
    },
    {
      id: '2',
      page_id: '1',
      name: 'button_click',
      status: 'to_test' as const,
      variables: {
        button_name: 'cta_signup',
        button_location: 'hero'
      },
      created_at: '2024-01-16T09:30:00Z',
      updated_at: '2024-01-19T16:10:00Z',
    },
  ] as Event[],

  variables: [
    {
      id: '1',
      product_id: '1',
      name: 'page_name',
      type: 'string' as const,
      description: 'Nom de la page visitée',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      product_id: '1',
      name: 'user_id',
      type: 'string' as const,
      description: 'Identifiant unique de l\'utilisateur',
      created_at: '2024-01-15T10:15:00Z',
      updated_at: '2024-01-15T10:15:00Z',
    },
    {
      id: '3',
      product_id: '1',
      name: 'transaction_value',
      type: 'number' as const,
      description: 'Montant de la transaction',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '4',
      product_id: '2',
      name: 'lead_score',
      type: 'number' as const,
      description: 'Score de qualification du lead',
      created_at: '2024-01-10T09:30:00Z',
      updated_at: '2024-01-10T09:30:00Z',
    },
  ] as Variable[],

  suggestedValues: [
    {
      id: '1',
      product_id: '1',
      value: 'homepage',
      is_contextual: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      product_id: '1',
      value: 'checkout',
      is_contextual: false,
      created_at: '2024-01-15T10:05:00Z',
      updated_at: '2024-01-15T10:05:00Z',
    },
    {
      id: '3',
      product_id: '1',
      value: '$page-name',
      is_contextual: true,
      created_at: '2024-01-15T10:10:00Z',
      updated_at: '2024-01-15T10:10:00Z',
    },
    {
      id: '4',
      product_id: '1',
      value: '$user-id',
      is_contextual: true,
      created_at: '2024-01-15T10:15:00Z',
      updated_at: '2024-01-15T10:15:00Z',
    },
    {
      id: '5',
      product_id: '2',
      value: 'lead-form',
      is_contextual: false,
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-10T09:00:00Z',
    },
    {
      id: '6',
      product_id: '2',
      value: '$campaign-id',
      is_contextual: true,
      created_at: '2024-01-10T09:05:00Z',
      updated_at: '2024-01-10T09:05:00Z',
    },
  ] as SuggestedValue[],

  variableValues: [
    // page_name variable can use these values
    { variable_id: '1', suggested_value_id: '1' }, // homepage
    { variable_id: '1', suggested_value_id: '2' }, // checkout
    { variable_id: '1', suggested_value_id: '3' }, // $page-name
    
    // user_id variable can use these values
    { variable_id: '2', suggested_value_id: '4' }, // $user-id
    
    // transaction_value variable (number type)
    // No associations yet
    
    // lead_score for product 2
    { variable_id: '4', suggested_value_id: '6' }, // $campaign-id
  ] as VariableValue[],

  comments: [
    {
      id: '1',
      event_id: '1',
      content: 'Ce pageview fonctionne parfaitement sur toutes les pages du site.',
      author: 'Marie Dupont',
      created_at: '2024-01-16T14:30:00Z',
    },
    {
      id: '2',
      event_id: '1',
      content: 'Attention: vérifier que la variable page_name est bien renseignée sur les pages dynamiques.',
      author: 'Jean Martin',
      created_at: '2024-01-17T09:15:00Z',
    },
    {
      id: '3',
      event_id: '2',
      content: 'Le tracking du bouton CTA nécessite des tests complémentaires sur mobile.',
      author: 'Sophie Laurent',
      created_at: '2024-01-18T16:45:00Z',
    },
    {
      id: '4',
      event_id: '2',
      content: 'Tests validés sur Chrome et Firefox, reste Safari à vérifier.',
      created_at: '2024-01-19T11:20:00Z',
    },
  ] as Comment[],

  eventHistory: [
    {
      id: '1',
      event_id: '1',
      field: 'status',
      old_value: 'to_implement',
      new_value: 'to_test',
      author: 'Jean Martin',
      created_at: '2024-01-17T08:30:00Z',
    },
    {
      id: '2',
      event_id: '1',
      field: 'status',
      old_value: 'to_test',
      new_value: 'validated',
      author: 'Marie Dupont',
      created_at: '2024-01-18T14:15:00Z',
    },
    {
      id: '3',
      event_id: '2',
      field: 'status',
      old_value: 'to_implement',
      new_value: 'to_test',
      author: 'Sophie Laurent',
      created_at: '2024-01-18T10:45:00Z',
    },
    {
      id: '4',
      event_id: '2',
      field: 'variables',
      old_value: '{"button_name": "cta_signup"}',
      new_value: '{"button_name": "cta_signup", "button_location": "hero"}',
      author: 'Jean Martin',
      created_at: '2024-01-19T16:20:00Z',
    },
    {
      id: '5',
      event_id: '1',
      field: 'test_date',
      old_value: null,
      new_value: '2024-01-18',
      author: 'Marie Dupont',
      created_at: '2024-01-18T14:16:00Z',
    },
  ] as EventHistory[],
}