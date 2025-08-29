/**
 * Utility functions for handling event properties
 */

/**
 * Parse properties from API response
 * Properties can come as either a JSON string or an object
 */
export const parseProperties = (properties: any): Record<string, any> => {
  if (typeof properties === 'string') {
    try {
      return JSON.parse(properties)
    } catch {
      return {}
    }
  }
  return properties || {}
}

/**
 * Get the count of properties in an event
 */
export const getPropertyCount = (properties: any): number => {
  return Object.keys(parseProperties(properties)).length
}

/**
 * Format properties for display
 */
export const formatPropertiesForDisplay = (properties: any): Record<string, any> => {
  return parseProperties(properties)
}