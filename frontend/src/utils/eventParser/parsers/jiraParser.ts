/**
 * Jira/Markdown Table Parser
 *
 * Parses markdown-style tables from Jira or similar tools:
 * | Property | Value |
 * |----------|-------|
 * | event    | purchase |
 */

import type { ParseResult } from '../types'

const EVENT_NAME_KEYS_LOWER = ['event', 'name', 'event_name', 'eventname']

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
 * Try to parse input as Jira markdown table
 *
 * @param input - Raw input string
 * @returns Parse result with event name and properties
 */
export function tryParseJira(input: string): ParseResult {
  const lines = input.split('\n').filter(l => l.trim())

  // Check if format looks like a table (lines with |)
  const hasTableFormat = lines.some(l => l.includes('|'))
  if (!hasTableFormat) {
    return {
      success: false,
      confidence: 'low'
    }
  }

  // Filter out separator lines (|---|---|)
  const dataLines = lines.filter(l => !l.match(/^\s*\|[\s-|]+\|\s*$/))

  const data: Record<string, any> = {}
  let eventName: string | undefined
  let isHeader = true

  for (const line of dataLines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)

    // Skip header row (first row typically)
    if (isHeader) {
      isHeader = false
      // Only skip if it looks like headers (Property, Value, etc.)
      const firstCell = cells[0]?.toLowerCase() || ''
      if (firstCell.includes('property') || firstCell.includes('key') || firstCell.includes('name')) {
        continue
      }
      // If not headers, process this line
      isHeader = false
    }

    if (cells.length < 2) continue

    const [key, value] = cells

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
      errors: ['Nom d\'événement non trouvé dans le tableau Jira'],
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
