/**
 * Tabular Parser
 *
 * Parses tab-separated data (Excel/CSV copy-paste).
 * Handles both with and without headers.
 */

import type { ParseResult } from '../types'

const EVENT_NAME_KEYS_LOWER = ['event', 'name', 'event_name', 'eventname']

/**
 * Parse value to appropriate type (string, number, boolean)
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
 * Try to parse input as tab-separated data
 *
 * @param input - Raw input string
 * @returns Parse result with event name and properties
 */
export function tryParseTabular(input: string): ParseResult {
  const lines = input.split('\n').filter(l => l.trim())

  // Check if format is tabular (presence of tabs)
  const hasT abs = lines.some(l => l.includes('\t'))
  if (!hasTabs) {
    return {
      success: false,
      confidence: 'low'
    }
  }

  const data: Record<string, any> = {}
  let eventName: string | undefined
  let skipFirstRow = false

  // Check if first row is header (contains "Property" or "Value")
  const firstRow = lines[0].toLowerCase()
  if (firstRow.includes('property') || firstRow.includes('value') || firstRow.includes('key')) {
    skipFirstRow = true
  }

  const dataLines = skipFirstRow ? lines.slice(1) : lines

  for (const line of dataLines) {
    const parts = line.split('\t').map(p => p.trim()).filter(Boolean)

    if (parts.length < 2) continue

    const [key, ...valueParts] = parts
    const value = valueParts.join(' ') // Join if value contains spaces

    // Check if this is the event name
    if (EVENT_NAME_KEYS_LOWER.includes(key.toLowerCase())) {
      eventName = value
    } else {
      data[key] = parseValue(value)
    }
  }

  if (!eventName) {
    return {
      success: false,
      errors: ['Nom d\'événement non trouvé dans le tableau'],
      confidence: 'low'
    }
  }

  return {
    success: true,
    eventName,
    properties: data,
    confidence: 'high'
  }
}
