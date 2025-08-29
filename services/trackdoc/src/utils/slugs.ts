/**
 * Utility functions for generating and handling URL slugs
 */

/**
 * Generate a URL-friendly slug from a string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáäâ]/g, 'a')
    .replace(/[èéëê]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöô]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Check if a slug is valid (contains only lowercase letters, numbers, and hyphens)
 */
export const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug)
}

/**
 * Generate a unique slug by appending a number if needed
 */
export const generateUniqueSlug = (text: string, existingSlugs: string[]): string => {
  let baseSlug = generateSlug(text)
  let uniqueSlug = baseSlug

  // Handle empty slug case
  if (!uniqueSlug) {
    uniqueSlug = 'item'
  }

  let counter = 1
  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${baseSlug || 'item'}-${counter}`
    counter++
  }

  return uniqueSlug
}