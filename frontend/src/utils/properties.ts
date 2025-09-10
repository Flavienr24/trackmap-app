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
 * Includes the automatic 'event' property that is always displayed
 */
export const getPropertyCount = (properties: any): number => {
  const parsedProperties = parseProperties(properties)
  // Always count the 'event' property (automatically added in display)
  // plus the actual properties, filtering out any existing 'event' property to avoid double counting
  return 1 + Object.keys(parsedProperties).filter(key => key !== 'event').length
}

/**
 * Format properties for display
 */
export const formatPropertiesForDisplay = (properties: any): Record<string, any> => {
  return parseProperties(properties)
}

/**
 * Get translated label for event status
 * Handles both uppercase and lowercase status values
 */
export const getStatusLabel = (status: string): string => {
  // Normalize to lowercase for comparison
  const normalizedStatus = status.toString().toLowerCase()
  
  switch (normalizedStatus) {
    case 'to_implement': return 'À implémenter'
    case 'to_test': return 'À tester'
    case 'validated': return 'Validé'
    case 'error': return 'Erreur'
    default: return status
  }
}