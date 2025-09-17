import React from 'react'
import { generateThumbnailUrl, handleImageError } from '@/utils/screenshotUtils'
import type { Screenshot } from '@/types'

interface ScreenshotThumbnailProps {
  screenshot: Screenshot
  index: number
  isSelected?: boolean
  onClick: (screenshot: Screenshot) => void
  onDelete?: (screenshot: Screenshot) => void
  disabled?: boolean
  className?: string
  showFullscreenIcon?: boolean
}

/**
 * Reusable Screenshot Thumbnail Component
 * Displays a clickable thumbnail with hover effects and delete button
 */
const ScreenshotThumbnail: React.FC<ScreenshotThumbnailProps> = ({
  screenshot,
  index,
  isSelected = false,
  onClick,
  onDelete,
  disabled = false,
  className = '',
  showFullscreenIcon = false
}) => {
  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={() => onClick(screenshot)}
        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 hover:shadow-md w-full cursor-pointer ${
          isSelected
            ? 'border-blue-500 shadow-md'
            : 'border-neutral-200'
        }`}
        title={`Voir le screenshot ${index + 1}`}
        disabled={disabled}
      >
        {/* PDF or Image preview */}
        {screenshot.format === 'pdf' ? (
          <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center">
            <svg className="w-8 h-8 text-red-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-red-600 font-medium">PDF</span>
          </div>
        ) : (
          <img
            src={generateThumbnailUrl(screenshot)}
            alt={`Screenshot ${index + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
            onError={(e) => handleImageError(e, screenshot)}
          />
        )}

        {/* Overlay with fullscreen icon for preview mode */}
        {showFullscreenIcon && (
          <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        )}
      </button>
      
      {/* Delete button */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(screenshot)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="Supprimer cette image"
          disabled={disabled}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export { ScreenshotThumbnail }