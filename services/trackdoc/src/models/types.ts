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

/**
 * Screenshot data interface for storing Cloudinary image information
 * Used in Event model to track uploaded screenshots
 */
export interface Screenshot {
  public_id: string; // Cloudinary public ID for the image
  secure_url: string; // HTTPS URL to access the image
  width: number; // Image width in pixels
  height: number; // Image height in pixels
  format: string; // Image format (jpg, png, etc.)
  bytes: number; // File size in bytes
  created_at: string; // Upload timestamp
  thumbnail_url?: string; // Optional thumbnail URL for display
}

/**
 * Request body interface for uploading screenshots
 * Used in POST /api/events/:id/screenshots endpoint
 */
export interface UploadScreenshotRequest {
  eventId: string; // Event ID to associate screenshots with
}

/**
 * Response interface for screenshot upload operation
 * Returns uploaded screenshot data
 */
export interface UploadScreenshotResponse {
  screenshots: Screenshot[]; // Array of uploaded screenshots
  message: string; // Success message
}

/**
 * Request body interface for creating/updating events with screenshots
 */
export interface CreateEventRequest {
  pageId: string;
  name: string;
  status?: string;
  testDate?: string;
  properties: string; // JSON string of event properties
  screenshots?: Screenshot[]; // Optional array of screenshots
}

export interface UpdateEventRequest {
  name?: string;
  status?: string;
  testDate?: string;
  properties?: string;
  screenshots?: Screenshot[]; // Optional array of screenshots for updates
}