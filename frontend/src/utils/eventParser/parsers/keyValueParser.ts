/**
 * Key-Value Parser
 *
 * Parses line-by-line key-value formats:
 * - key: value
 * - key = value
 * - key | value
 * - key value (whitespace-separated, key must be single word)
 */

import type { ParseResult } from '../types'

const EVENT_NAME_KEYS_LOWER = ['event', 'name', 'event_name', 'eventname']

// Patterns to match: "key: value", "key = value", "key | value", "key value"
// Order matters: explicit separators first, then whitespace fallback
const PATTERNS = [
  /^(.+?):\s*(.+)$/,     // Colon
  /^(.+?)\s*=\s*(.+)$/,  // Equals
  /^(.+?)\|\s*(.+)$/,    // Pipe
  /^(\S+)\s+(.+)$/       // Whitespace (key must be single word without spaces)
]

/**
 * Parse value to appropriate type
 */
function parseValue(value: string): any {
  const trimmed = value.trim()

  // Boolean
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  // Number
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed)
  }

  // String by default
  return trimmed
}

/**
 * Try to parse input as line-by-line key-value format
 *
 * @param input - Raw input string
 * @returns Parse result with event name and properties
 */
export function tryParseKeyValue(input: string): ParseResult {
  const lines = input.split('\n').filter(l => l.trim())

  const data: Record<string, any> = {}
  let eventName: string | undefined
  let matchedPattern: RegExp | null = null

  for (const line of lines) {
    let matched = false

    for (const pattern of PATTERNS) {
      const match = line.match(pattern)
      if (match) {
        const [, rawKey, rawValue] = match
        const key = rawKey.trim()
        const value = rawValue.trim()

        // Check if this is the event name
        if (EVENT_NAME_KEYS_LOWER.includes(key.toLowerCase())) {
          eventName = value
        } else {
          data[key] = parseValue(value)
        }

        matched = true
        matchedPattern = pattern
        break
      }
    }

    // If line doesn't match any pattern and has content, fail
    if (!matched && line.trim()) {
      return {
        success: false,
        errors: ['Format ligne invalide. Utilisez "clé: valeur" ou "clé = valeur"'],
        confidence: 'low'
      }
    }
  }

  if (!eventName) {
    return {
      success: false,
      errors: ['Nom d\'événement non trouvé (ajoutez "event: nom_event")'],
      confidence: 'low'
    }
  }

  return {
    success: true,
    eventName,
    properties: data,
    confidence: 'medium'
  }
}
