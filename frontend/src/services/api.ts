/**
 * API Service Layer for TrackMap Application
 * Handles all HTTP requests to the backend API
 */

import type {
  Product,
  Page,
  Event,
  ApiResponse,
  PaginatedResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateEventRequest,
  UpdateEventRequest,
  ProductsFilter,
  PagesFilter,
  EventsFilter,
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
 * Mock data for development
 * TODO: Remove when backend is ready
 */
export const mockData = {
  products: [
    {
      id: '1',
      name: 'E-commerce Mobile App',
      description: 'Mobile application for e-commerce tracking',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z',
      pages_count: 8,
      events_count: 24,
      health_score: 85,
    },
    {
      id: '2', 
      name: 'Marketing Website',
      description: 'Corporate website with lead generation',
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
      url: 'https://app.ecommerce.fr/',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-20T11:00:00Z',
      events_count: 5,
    },
    {
      id: '2',
      product_id: '1',
      name: 'Product Page',
      url: 'https://app.ecommerce.fr/products/*',
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
}