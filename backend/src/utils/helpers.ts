// Helper utility functions for common operations
// Reusable functions used across the application

/**
 * Async handler wrapper for Express route handlers
 * Automatically catches async errors and passes them to Express error handler
 * @param fn - Async function to wrap
 * @returns Express middleware function with error handling
 */
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Removes undefined, null, and empty string values from an object
 * Useful for cleaning up request bodies and database queries
 * @param obj - Object to sanitize
 * @returns New object with only truthy values (excluding false and 0)
 */
export const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Generates a pseudo-random request ID for tracking
 * Used for correlating logs across request lifecycle
 * @returns Random alphanumeric string
 */
export const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};