/**
 * Context Enricher
 *
 * Enriches parsed event data with context from database.
 * Detects duplicates, suggests similar matches, identifies new properties/values.
 */

import type { ParseResult, EnhancedParseResult, PropertyMatch, ImportContext } from '../types'
import { hasExactMatch, findBestMatchWithLearning } from './fuzzyMatcher'

/**
 * Enrich parse result with context information
 *
 * Adds:
 * - Event name duplicate detection
 * - Property key/value existence checks
 * - Similarity suggestions
 * - New item identification
 *
 * @param result - Base parse result
 * @param context - Import context from database
 * @param productId - Product ID for learning engine
 * @returns Enhanced parse result with match information
 */
export function enrichWithContext(
  result: ParseResult,
  context: ImportContext,
  productId: string
): EnhancedParseResult {
  if (!result.success || !result.eventName) {
    return {
      ...result,
      eventNameMatch: undefined,
      propertiesMatches: undefined
    }
  }

  const warnings: string[] = [...(result.warnings || [])]
  const suggestions: string[] = []

  // Check event name
  const eventNameMatch = checkEventName(result.eventName, context, productId, warnings, suggestions)

  // Check properties
  const propertiesMatches = checkProperties(
    result.properties || {},
    context,
    productId,
    warnings,
    suggestions
  )

  return {
    ...result,
    eventNameMatch,
    propertiesMatches,
    warnings,
    suggestions
  }
}

/**
 * Check if event name exists or is similar to existing events
 */
function checkEventName(
  eventName: string,
  context: ImportContext,
  productId: string,
  warnings: string[],
  suggestions: string[]
): EnhancedParseResult['eventNameMatch'] {
  const { eventNames } = context

  // Check exact match
  if (hasExactMatch(eventName, eventNames)) {
    warnings.push(`⚠️ Un event "${eventName}" existe déjà`)
    return {
      exists: true,
      existingEventId: undefined // We don't have ID in context (only names)
    }
  }

  // Check fuzzy match
  const similarMatch = findBestMatchWithLearning(
    eventName,
    eventNames,
    productId,
    'event',
    0.75
  )

  if (similarMatch) {
    suggestions.push(
      `💡 Événement similaire: "${similarMatch.value}" ` +
      `(${Math.round(similarMatch.score * 100)}% similaire)${similarMatch.boosted ? ' [appris]' : ''}`
    )
    return {
      exists: false,
      similar: similarMatch.value,
      similarity: similarMatch.score
    }
  }

  return {
    exists: false
  }
}

/**
 * Check properties against context
 */
function checkProperties(
  properties: Record<string, any>,
  context: ImportContext,
  productId: string,
  warnings: string[],
  suggestions: string[]
): Record<string, PropertyMatch> {
  const matches: Record<string, PropertyMatch> = {}

  const propertyNames = context.properties.map(p => p.name)
  const allSuggestedValues = context.suggestedValues.map(sv => sv.value)

  for (const [key, value] of Object.entries(properties)) {
    const match: PropertyMatch = {
      keyExists: false,
      valueExists: false,
      isNewKey: false,
      isNewValue: false
    }

    // Check if key exists
    const keyMatch = findBestMatchWithLearning(
      key,
      propertyNames,
      productId,
      'property',
      0.80 // Stricter threshold for properties
    )

    if (keyMatch) {
      if (keyMatch.score === 1) {
        // Exact match
        match.keyExists = true
        const property = context.properties.find(p => p.name === keyMatch.value)
        match.keyId = property?.id
      } else {
        // Similar match
        match.keyExists = false
        suggestions.push(
          `💡 Pour la clé "${key}", propriété similaire: "${keyMatch.value}"${keyMatch.boosted ? ' [appris]' : ''}`
        )
      }
    } else {
      // New property
      match.isNewKey = true
      warnings.push(`⚠️ Nouvelle propriété: "${key}"`)
    }

    // Check if value exists (only for string values)
    const valueStr = String(value)
    if (typeof value === 'string' || typeof value === 'number') {
      const valueMatch = findBestMatchWithLearning(
        valueStr,
        allSuggestedValues,
        productId,
        'value',
        0.75
      )

      if (valueMatch) {
        if (valueMatch.score === 1) {
          // Exact match
          match.valueExists = true
          const suggestedValue = context.suggestedValues.find(sv => sv.value === valueMatch.value)
          match.valueId = suggestedValue?.id
          match.boosted = valueMatch.boosted
        } else {
          // Similar match
          match.valueExists = false
          match.valueSimilar = valueMatch.value
          match.valueSimilarity = valueMatch.score
          match.boosted = valueMatch.boosted
        }
      } else {
        // New value
        match.isNewValue = true
      }
    }

    matches[key] = match
  }

  return matches
}
