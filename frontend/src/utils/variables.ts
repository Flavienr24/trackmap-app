/**
 * Utility functions for handling event variables
 */

/**
 * Parse variables from API response
 * Variables can come as either a JSON string or an object
 */
export const parseVariables = (variables: any): Record<string, any> => {
  if (typeof variables === 'string') {
    try {
      return JSON.parse(variables)
    } catch {
      return {}
    }
  }
  return variables || {}
}

/**
 * Get the count of variables in an event
 */
export const getVariableCount = (variables: any): number => {
  return Object.keys(parseVariables(variables)).length
}

/**
 * Format variables for display
 */
export const formatVariablesForDisplay = (variables: any): Record<string, any> => {
  return parseVariables(variables)
}