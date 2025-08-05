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

/**
 * Safely parses JSON string with error handling
 * Returns the original value if it's already an object, fallback value on parse error
 * @param value - String to parse or object to return as-is
 * @param fallback - Fallback value if parsing fails (default: {})
 * @returns Parsed object or fallback value
 */
export const safeJsonParse = (value: any, fallback: any = {}): any => {
  // Return as-is if already an object
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  // Return fallback if not a string
  if (typeof value !== 'string') {
    return fallback;
  }
  
  try {
    return JSON.parse(value);
  } catch (error) {
    // Log the error for debugging but don't throw
    console.warn('JSON parse error:', error, 'Value:', value);
    return fallback;
  }
};

/**
 * Database operation wrapper with enhanced error handling
 * Wraps database operations with consistent error handling and retries
 * @param operation - Database operation function to execute
 * @param context - Context information for logging
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Result of the database operation
 */
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  context: { operation: string; [key: string]: any },
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Log the attempt
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries})`, {
        ...context,
        error: lastError.message,
        attempt
      });
      
      // Don't retry on certain errors (validation, not found, etc.)
      if (lastError.message.includes('not found') || 
          lastError.message.includes('required') ||
          lastError.message.includes('Invalid') ||
          lastError.message.includes('duplicate')) {
        throw lastError;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - lastError will be defined here
  if (lastError) {
    console.error('Database operation failed after all retries', {
      ...context,
      maxRetries,
      finalError: lastError.message
    });
    
    throw lastError;
  }
  
  // This should never happen, but TypeScript requires it
  throw new Error('Database operation failed with unknown error');
};