/**
 * Utilities for handling URL slugs from product names
 */

/**
 * Convert a product name to a URL-safe slug
 * Examples:
 * - "MyServier" -> "myservier"
 * - "My Health Partner" -> "my-health-partner" 
 * - "Test Product" -> "test-product"
 */
export function slugifyProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()         // Convert to lowercase
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, '') // Remove non-alphanumeric chars except hyphens (lowercase only)
    .replace(/-+/g, '-')   // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Convert a URL slug back to the original product name for API queries
 * Examples:
 * - "myservier" -> "MyServier"
 * - "my-health-partner" -> "My Health Partner"
 * - "test-product" -> "Test Product"
 */
export function unslugifyProductName(slug: string): string {
  return slug
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
    .join(' ')
    .trim()
}

/**
 * Check if a product name matches a URL slug
 */
export function doesProductNameMatchSlug(productName: string, slug: string): boolean {
  return slugifyProductName(productName) === slug
}