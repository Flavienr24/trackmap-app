/**
 * Screenshot utilities for shared logic between modals
 */

import type { Screenshot } from '@/types'

/**
 * Extracts the public ID from a full Cloudinary public ID path
 * @param fullPublicId - Full public ID (e.g., "trackmap/screenshots/eventId/actualId")
 * @returns The actual public ID (e.g., "actualId")
 */
export const extractPublicId = (fullPublicId: string): string => {
  const parts = fullPublicId.split('/')
  return parts[parts.length - 1]
}

/**
 * Deletes a screenshot from the server
 * @param eventId - The event ID
 * @param screenshot - The screenshot to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteScreenshot = async (eventId: string, screenshot: Screenshot): Promise<void> => {
  const actualPublicId = extractPublicId(screenshot.public_id)
  
  const response = await fetch(`/api/events/${eventId}/screenshots/${actualPublicId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete screenshot')
  }
}

/**
 * Generates a Cloudinary thumbnail URL for a screenshot
 * @param screenshot - The screenshot object
 * @param width - Thumbnail width (default: 300)
 * @param height - Thumbnail height (default: 200)
 * @returns The thumbnail URL
 */
export const generateThumbnailUrl = (screenshot: Screenshot, width = 300, height = 200): string => {
  const extension = screenshot.secure_url.split('.').pop()
  return `https://res.cloudinary.com/dzsa7xwme/image/upload/w_${width},h_${height},c_fill/${screenshot.public_id}.${extension}`
}

/**
 * Handles image loading errors with fallback logic
 * @param event - The error event from img element
 * @param screenshot - The screenshot object
 * @param onBrokenImage - Optional callback for handling broken images
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  screenshot: Screenshot,
  onBrokenImage?: (screenshot: Screenshot) => void
): void => {
  const img = event.currentTarget
  
  console.log('Image failed to load:', screenshot.thumbnail_url, 'fallback:', screenshot.secure_url)
  console.log('Full screenshot object:', screenshot)
  
  // Try secure_url as fallback
  if (img.src !== screenshot.secure_url) {
    img.src = screenshot.secure_url
  } else {
    // Both thumbnail and secure_url failed - image doesn't exist anymore
    console.warn('Screenshot appears to be deleted from Cloudinary:', screenshot.public_id)
    img.style.display = 'none'
    
    // Call the broken image callback if provided
    if (onBrokenImage) {
      onBrokenImage(screenshot)
    }
  }
}