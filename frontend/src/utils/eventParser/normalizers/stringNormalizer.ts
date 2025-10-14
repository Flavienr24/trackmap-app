/**
 * String Normalizer
 *
 * Utility functions to normalize strings for comparison in fuzzy matching.
 * Handles accents, casing, and whitespace variations.
 */

/**
 * Normalize string for comparison
 *
 * - Converts to lowercase
 * - Removes accents (é → e, à → a, etc.)
 * - Trims whitespace
 * - Replaces multiple spaces with underscores
 *
 * @param str - Input string to normalize
 * @returns Normalized string
 *
 * @example
 * normalizeString('Événement Achat')  // → 'evenement_achat'
 * normalizeString('  page-name  ')    // → 'page-name'
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, '_') // Replace spaces with underscores
}

/**
 * Strip punctuation from string (keep only alphanumeric and underscores)
 *
 * Useful for aggressive matching where punctuation differences shouldn't matter.
 *
 * @param str - Input string
 * @returns String with only alphanumeric characters and underscores
 *
 * @example
 * stripPunctuation('button_click!')  // → 'button_click'
 * stripPunctuation('user.id')        // → 'userid'
 */
export function stripPunctuation(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '')
}

/**
 * Normalize for aggressive matching
 *
 * Combines normalization + punctuation stripping for maximum flexibility.
 *
 * @param str - Input string
 * @returns Aggressively normalized string
 *
 * @example
 * normalizeAggressive('Page-View!')  // → 'pageview'
 * normalizeAggressive('Événement Achat')  // → 'evenement_achat'
 */
export function normalizeAggressive(str: string): string {
  return stripPunctuation(normalizeString(str))
}
