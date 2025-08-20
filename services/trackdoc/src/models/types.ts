// TypeScript interfaces and types for API request/response models
// Provides type safety for request bodies and API responses

/**
 * Request body interface for creating a new product
 * Used to validate incoming POST requests to /api/products
 */
export interface CreateProductRequest {
  name: string; // Required product name
  description?: string; // Optional product description
  hasInstances?: boolean; // Whether product supports multiple instances
  currentEnvironment?: string; // Environment if hasInstances is false
}

/**
 * Request body interface for updating an existing product
 * All fields are optional for partial updates
 */
export interface UpdateProductRequest {
  name?: string;
  description?: string;
  hasInstances?: boolean;
  currentEnvironment?: string;
}

/**
 * Standard API response format used across all endpoints
 * Provides consistent response structure with optional data and metadata
 */
export interface ApiResponse<T = any> {
  success: boolean; // Indicates if the request was successful
  data?: T; // Response payload (type-safe with generics)
  message?: string; // Optional message for errors or info
  count?: number; // Optional count for list responses
}

/**
 * Error response interface for failed API requests
 * Used by error handler middleware to ensure consistent error format
 */
export interface ApiError {
  success: false; // Always false for errors
  message: string; // Error description
  statusCode?: number; // HTTP status code
}