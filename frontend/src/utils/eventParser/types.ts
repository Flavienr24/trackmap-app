/**
 * Event Parser Types
 *
 * Shared interfaces and types for the event parsing system.
 */

import type { ImportContext } from '@/types/importContext'

/**
 * Base parse result - returned by individual parsers
 */
export interface ParseResult {
  success: boolean
  eventName?: string
  properties?: Record<string, any>
  errors?: string[]
  warnings?: string[]
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Enhanced parse result - returned after context enrichment
 */
export interface EnhancedParseResult extends ParseResult {
  eventNameMatch?: {
    exists: boolean
    existingEventId?: string
    similar?: string
    similarity?: number
  }
  propertiesMatches?: Record<string, PropertyMatch>
  suggestions?: string[]
}

/**
 * Property match information
 */
export interface PropertyMatch {
  keyExists: boolean
  keyId?: string
  valueExists: boolean
  valueId?: string
  valueSimilar?: string
  valueSimilarity?: number
  isNewKey: boolean
  isNewValue: boolean
  boosted?: boolean // If learning engine provided a boost
}

/**
 * Parsed event data - final output for UI
 */
export interface ParsedEventData {
  eventName: string
  properties: Record<string, any>
  confidence: 'high' | 'medium' | 'low'
  warnings?: string[]
  suggestions?: string[]
  metadata?: {
    newPropertiesCount?: number
    newValuesCount?: number
    boostedMatches?: number
  }
}

/**
 * Parser function signature
 */
export type ParserFunction = (input: string) => ParseResult

/**
 * Export ImportContext for convenience
 */
export type { ImportContext }
