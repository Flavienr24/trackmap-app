/**
 * Fuzzy Matching Engine
 *
 * Finds similar strings using Levenshtein distance with optimizations.
 * Supports learning engine integration for improved accuracy.
 */

import { normalizeString } from '../normalizers/stringNormalizer'
import { learningEngine } from './learningEngine'

// Common tokens to ignore in event/property names
const COMMON_TOKENS = new Set([
  'event', 'click', 'view', 'page', 'button', 'user', 'action', 'submit'
])

/**
 * Calculate Levenshtein distance between two strings
 *
 * Optimized with early exit if strings are too different in length.
 * Time complexity: O(m*n) but with practical optimizations.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (number of changes needed)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Early exit if length difference too large
  const lengthDiff = Math.abs(a.length - b.length)
  if (lengthDiff > 5) return Infinity

  const matrix: number[][] = []

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score (0-1) between two strings
 *
 * @param target - Target string
 * @param candidate - Candidate string to compare
 * @param ignoreCommonTokens - Whether to filter out common tokens
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
export function similarity(
  target: string,
  candidate: string,
  ignoreCommonTokens = true
): number {
  const normTarget = normalizeString(target)
  const normCandidate = normalizeString(candidate)

  // Filter common tokens if requested
  let cleanTarget = normTarget
  let cleanCandidate = normCandidate

  if (ignoreCommonTokens) {
    const targetTokens = normTarget.split('_').filter(t => !COMMON_TOKENS.has(t))
    const candidateTokens = normCandidate.split('_').filter(t => !COMMON_TOKENS.has(t))
    cleanTarget = targetTokens.join('_')
    cleanCandidate = candidateTokens.join('_')
  }

  // Handle empty strings after token filtering
  if (cleanTarget === '' || cleanCandidate === '') {
    return normTarget === normCandidate ? 1 : 0
  }

  const distance = levenshteinDistance(cleanTarget, cleanCandidate)
  const maxLength = Math.max(cleanTarget.length, cleanCandidate.length)

  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

/**
 * Find best matching string from candidates
 *
 * @param target - String to match
 * @param candidates - Array of candidate strings
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Best match with score, or null if none above threshold
 */
export function findBestMatch(
  target: string,
  candidates: string[],
  threshold = 0.75
): { value: string; score: number } | null {
  let bestMatch: { value: string; score: number } | null = null

  for (const candidate of candidates) {
    const score = similarity(target, candidate)
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { value: candidate, score }
    }
  }

  return bestMatch
}

/**
 * Find best match with learning engine integration
 *
 * Applies boost from previously accepted suggestions to improve accuracy.
 *
 * @param target - String to match
 * @param candidates - Array of candidate strings
 * @param productId - Product context for learning
 * @param type - Type of match (event, property, or value)
 * @param baseThreshold - Base similarity threshold
 * @returns Best match with score and boost info, or null
 */
export function findBestMatchWithLearning(
  target: string,
  candidates: string[],
  productId: string,
  type: 'event' | 'property' | 'value',
  baseThreshold = 0.75
): { value: string; score: number; boosted: boolean } | null {
  let bestMatch: { value: string; score: number; boosted: boolean } | null = null

  // Adjust threshold based on type (properties should be stricter)
  const threshold = type === 'property' ? 0.80 : baseThreshold

  for (const candidate of candidates) {
    const baseScore = similarity(target, candidate)
    const boost = learningEngine.getBoostScore(target, candidate, productId, type)
    const finalScore = Math.min(1, baseScore + boost)

    if (finalScore >= threshold && (!bestMatch || finalScore > bestMatch.score)) {
      bestMatch = {
        value: candidate,
        score: finalScore,
        boosted: boost > 0
      }
    }
  }

  return bestMatch
}

/**
 * Check if string is exact match (case-insensitive)
 *
 * @param target - Target string
 * @param candidates - Array of candidate strings
 * @returns True if exact match found
 */
export function hasExactMatch(target: string, candidates: string[]): boolean {
  const normalized = normalizeString(target)
  return candidates.some(c => normalizeString(c) === normalized)
}
