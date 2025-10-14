/**
 * Fuzzy Matching Learning Engine
 *
 * Learns from user-accepted suggestions to improve matching accuracy over time.
 * Stores learned matches in localStorage with automatic decay for recency.
 */

interface LearnedMatch {
  userInput: string
  acceptedSuggestion: string
  timestamp: number
  productId: string
  type: 'event' | 'property' | 'value'
}

const STORAGE_KEY = 'trackmap_learned_matches'
const MAX_STORED = 500 // Limit to prevent localStorage bloat
const DECAY_PERIOD_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Learning engine to improve fuzzy matching over time
 *
 * Features:
 * - Records user-accepted suggestions
 * - Provides boost scores for previously accepted matches
 * - Automatic decay for old matches (less relevant over time)
 * - Limited storage (500 most recent matches)
 * - Per-product and per-type learning
 */
export class FuzzyLearningEngine {
  private learned: LearnedMatch[]

  constructor() {
    this.learned = this.loadFromStorage()
    this.cleanOldMatches()
  }

  /**
   * Record a user-accepted suggestion
   *
   * @param userInput - What the user typed
   * @param acceptedSuggestion - What they selected
   * @param productId - Product context
   * @param type - Type of match (event, property, or value)
   */
  recordAcceptedMatch(
    userInput: string,
    acceptedSuggestion: string,
    productId: string,
    type: 'event' | 'property' | 'value'
  ): void {
    const match: LearnedMatch = {
      userInput: userInput.toLowerCase().trim(),
      acceptedSuggestion,
      timestamp: Date.now(),
      productId,
      type
    }

    // Add to beginning (most recent first)
    this.learned.unshift(match)

    // Keep only most recent MAX_STORED entries
    if (this.learned.length > MAX_STORED) {
      this.learned = this.learned.slice(0, MAX_STORED)
    }

    this.saveToStorage()
  }

  /**
   * Get learned boost for a given input
   *
   * Returns a score boost (0-0.2) based on past accepted matches.
   * Higher boost for exact previous matches, lower for similar patterns.
   *
   * @param userInput - What the user is currently typing
   * @param candidate - Potential match to score
   * @param productId - Product context
   * @param type - Type of match
   * @returns Boost score (0-0.2)
   */
  getBoostScore(
    userInput: string,
    candidate: string,
    productId: string,
    type: 'event' | 'property' | 'value'
  ): number {
    const normalizedInput = userInput.toLowerCase().trim()

    // Find relevant matches for this input
    const relevantMatches = this.learned.filter(
      m => m.userInput === normalizedInput &&
           m.productId === productId &&
           m.type === type
    )

    if (relevantMatches.length === 0) return 0

    // Check if this candidate was previously accepted
    const exactMatch = relevantMatches.find(m => m.acceptedSuggestion === candidate)
    if (exactMatch) {
      // Strong boost for exact previous match (0.15-0.2)
      const age = Date.now() - exactMatch.timestamp
      const recencyFactor = Math.max(0, 1 - (age / DECAY_PERIOD_MS))
      return 0.2 * (0.75 + recencyFactor * 0.25) // Base 0.15, up to 0.2 for recent
    }

    // Small boost if user often chooses similar patterns (0.05)
    const similarCount = relevantMatches.filter(m => {
      const similarity = this.calculateSimilarity(m.acceptedSuggestion, candidate)
      return similarity > 0.8
    }).length

    return Math.min(0.05, similarCount * 0.01)
  }

  /**
   * Simple similarity calculation (0-1)
   * Uses basic string matching for performance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()

    if (s1 === s2) return 1

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const shorter = s1.length < s2.length ? s1 : s2
      const longer = s1.length < s2.length ? s2 : s1
      return shorter.length / longer.length
    }

    return 0
  }

  /**
   * Get statistics about learned matches
   */
  getStats(): {
    total: number
    byType: Record<string, number>
    byProduct: Record<string, number>
    oldestMatch: Date | null
    newestMatch: Date | null
  } {
    const byType: Record<string, number> = {}
    const byProduct: Record<string, number> = {}

    this.learned.forEach(match => {
      byType[match.type] = (byType[match.type] || 0) + 1
      byProduct[match.productId] = (byProduct[match.productId] || 0) + 1
    })

    return {
      total: this.learned.length,
      byType,
      byProduct,
      oldestMatch: this.learned.length > 0
        ? new Date(this.learned[this.learned.length - 1].timestamp)
        : null,
      newestMatch: this.learned.length > 0
        ? new Date(this.learned[0].timestamp)
        : null
    }
  }

  /**
   * Clear all learned data (for testing or reset)
   */
  clear(): void {
    this.learned = []
    this.saveToStorage()
  }

  /**
   * Clean matches older than decay period
   */
  private cleanOldMatches(): void {
    const cutoff = Date.now() - DECAY_PERIOD_MS * 2 // Keep 2x decay period
    this.learned = this.learned.filter(m => m.timestamp > cutoff)
    this.saveToStorage()
  }

  /**
   * Load learned matches from localStorage
   */
  private loadFromStorage(): LearnedMatch[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('Failed to load learned matches from localStorage:', error)
      return []
    }
  }

  /**
   * Save learned matches to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.learned))
    } catch (error) {
      console.warn('Failed to save learned matches to localStorage:', error)
    }
  }
}

// Singleton instance
export const learningEngine = new FuzzyLearningEngine()
