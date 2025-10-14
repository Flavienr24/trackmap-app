/**
 * JSON Parser
 *
 * Parses JSON-formatted event data.
 * Supports multiple event name keys: "event", "name", "event_name", "eventName"
 */

import type { ParseResult } from '../types'

// Possible keys for event name in JSON
const EVENT_NAME_KEYS = ['event', 'name', 'event_name', 'eventName']

/**
 * Try to parse input as JSON
 *
 * @param input - Raw input string
 * @returns Parse result with event name and properties
 */
export function tryParseJSON(input: string): ParseResult {
  try {
    const parsed = JSON.parse(input)

    // Ensure it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        success: false,
        errors: ['JSON doit être un objet, pas un array ou une primitive'],
        confidence: 'low'
      }
    }

    // Find event name from possible keys
    let eventName: string | undefined

    for (const key of EVENT_NAME_KEYS) {
      if (key in parsed && typeof parsed[key] === 'string') {
        eventName = parsed[key]
        break
      }
    }

    if (!eventName) {
      return {
        success: false,
        errors: [
          `Impossible de détecter le nom de l'événement. ` +
          `Utilisez une des clés: ${EVENT_NAME_KEYS.join(', ')}`
        ],
        confidence: 'low'
      }
    }

    // Build properties object (exclude event name keys)
    const properties: Record<string, any> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!EVENT_NAME_KEYS.includes(key)) {
        properties[key] = value
      }
    }

    return {
      success: true,
      eventName,
      properties,
      confidence: 'high'
    }
  } catch (error) {
    // Not valid JSON
    return {
      success: false,
      confidence: 'low'
    }
  }
}
