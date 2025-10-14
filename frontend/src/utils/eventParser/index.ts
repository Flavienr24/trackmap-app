/**
 * Event Parser - Main Orchestrator
 *
 * Public API for parsing event data from various formats.
 * Tries each parser in sequence, enriches with context if available.
 */

import type { ParseResult, EnhancedParseResult, ImportContext } from './types'
import { tryParseJSON } from './parsers/jsonParser'
import { tryParseTabular } from './parsers/tabularParser'
import { tryParseKeyValue } from './parsers/keyValueParser'
import { tryParseJira } from './parsers/jiraParser'
import { enrichWithContext } from './enrichment/contextEnricher'

/**
 * Parse event data from raw input
 *
 * Tries parsers in priority order:
 * 1. JSON (most structured, highest confidence)
 * 2. Tabular (Excel/CSV)
 * 3. Key-Value (line by line)
 * 4. Jira (markdown tables)
 *
 * If context is provided, enriches result with duplicate detection
 * and similarity suggestions.
 *
 * @param rawInput - Raw input string (any format)
 * @param context - Optional import context from database
 * @param productId - Optional product ID (required if context provided)
 * @returns Parse result (enhanced if context provided)
 *
 * @example
 * // Simple parsing
 * const result = parseEventData('{"event": "purchase", "value": 99.99}')
 *
 * // With context for duplicate detection
 * const result = parseEventData(input, importContext, productId)
 */
export function parseEventData(
  rawInput: string,
  context?: ImportContext,
  productId?: string
): ParseResult | EnhancedParseResult {
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return {
      success: false,
      errors: ['Input vide'],
      confidence: 'low'
    }
  }

  // Try parsers in priority order
  const parsers = [
    { name: 'JSON', fn: tryParseJSON },
    { name: 'Tabular', fn: tryParseTabular },
    { name: 'KeyValue', fn: tryParseKeyValue },
    { name: 'Jira', fn: tryParseJira }
  ]

  for (const parser of parsers) {
    const result = parser.fn(trimmed)
    if (result.success) {
      // Enrich with context if available
      if (context && productId) {
        return enrichWithContext(result, context, productId)
      }
      return result
    }
  }

  // No parser succeeded
  return {
    success: false,
    errors: [
      'Format non reconnu.',
      'Formats supportés: JSON, CSV/Excel (tab-separated), ligne par ligne (clé: valeur), Jira (tableau markdown)'
    ],
    confidence: 'low'
  }
}

/**
 * Re-export types for convenience
 */
export type {
  ParseResult,
  EnhancedParseResult,
  PropertyMatch,
  ParsedEventData,
  ImportContext
} from './types'

/**
 * Re-export learning engine for UI integration
 */
export { learningEngine } from './enrichment/learningEngine'
