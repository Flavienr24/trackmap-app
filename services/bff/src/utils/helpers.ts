// BFF Utility Functions

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
