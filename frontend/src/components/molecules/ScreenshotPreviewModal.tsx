import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/ui/button'
import type { Screenshot } from '@/types'

interface ScreenshotPreviewModalProps {
  isOpen: boolean
  screenshots: Screenshot[]
  currentIndex: number
  onClose: () => void
  onDelete?: (screenshot: Screenshot) => void
  onNavigate?: (direction: 'prev' | 'next') => void
}

/**
 * Screenshot Preview Modal
 * Displays screenshots in full size with navigation, zoom controls and image details
 * Handles responsive sizing and keyboard navigation
 */
const ScreenshotPreviewModal: React.FC<ScreenshotPreviewModalProps> = ({
  isOpen,
  screenshots,
  currentIndex,
  onClose,
  onDelete,
  onNavigate,
}) => {
  const [imageScale, setImageScale] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const currentScreenshot = screenshots[currentIndex]

  // Reset state when screenshot changes
  useEffect(() => {
    if (currentScreenshot) {
      setImageScale(1)
      setImageLoaded(false)
      setImageError(false)
    }
  }, [currentScreenshot])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return

    switch (event.key) {
      case 'ArrowLeft':
        if (currentIndex > 0 && onNavigate) {
          onNavigate('prev')
        }
        break
      case 'ArrowRight':
        if (currentIndex < screenshots.length - 1 && onNavigate) {
          onNavigate('next')
        }
        break
      case 'Escape':
        onClose()
        break
      case '+':
      case '=':
        event.preventDefault()
        setImageScale(prev => Math.min(prev * 1.2, 5))
        break
      case '-':
        event.preventDefault()
        setImageScale(prev => Math.max(prev / 1.2, 0.1))
        break
      case '0':
        event.preventDefault()
        setImageScale(1)
        break
    }
  }, [isOpen, currentIndex, screenshots.length, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Navigate to previous screenshot
  const goToPrevious = () => {
    if (currentIndex > 0 && onNavigate) {
      onNavigate('prev')
    }
  }

  // Navigate to next screenshot
  const goToNext = () => {
    if (currentIndex < screenshots.length - 1 && onNavigate) {
      onNavigate('next')
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`
  }

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  // Handle image error
  const handleImageError = () => {
    setImageLoaded(false)
    setImageError(true)
  }

  if (!currentScreenshot) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Screenshot ${currentIndex + 1} sur ${screenshots.length}`}
      size="2xl"
    >
      <div className="flex flex-col h-full bg-neutral-900">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4 bg-neutral-800 text-white flex-shrink-0">
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="text-white border-neutral-600 hover:bg-neutral-700"
              >
                ← Précédent
              </Button>
              <span className="text-sm text-neutral-300">
                {currentIndex + 1} / {screenshots.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex === screenshots.length - 1}
                className="text-white border-neutral-600 hover:bg-neutral-700"
              >
                Suivant →
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-2 border-l border-neutral-600 pl-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageScale(prev => Math.max(prev / 1.2, 0.1))}
                className="text-white border-neutral-600 hover:bg-neutral-700"
              >
                -
              </Button>
              <span className="text-sm text-neutral-300 min-w-[4rem] text-center">
                {Math.round(imageScale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageScale(prev => Math.min(prev * 1.2, 5))}
                className="text-white border-neutral-600 hover:bg-neutral-700"
              >
                +
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageScale(1)}
                className="text-white border-neutral-600 hover:bg-neutral-700"
              >
                100%
              </Button>
            </div>
          </div>

        </div>

        {/* Main image container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div className="relative max-w-full max-h-full">
            {/* Loading state */}
            {!imageLoaded && !imageError && (
              <div className="flex items-center justify-center min-h-[400px] min-w-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}

            {/* Error state */}
            {imageError && (
              <div className="flex items-center justify-center min-h-[400px] min-w-[400px] text-white">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-neutral-400">Erreur lors du chargement de l'image</p>
                </div>
              </div>
            )}

            {/* Main image */}
            <img
              src={currentScreenshot.secure_url}
              alt={`Screenshot ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${imageScale})`,
                maxHeight: '65vh',
                maxWidth: '80vw'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>
        </div>

        {/* Footer with image info */}
        <div className="bg-neutral-800 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div>
                <span className="text-neutral-400">Format:</span>
                <span className="ml-2 font-medium">{currentScreenshot.format.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-neutral-400">Dimensions:</span>
                <span className="ml-2 font-medium">{currentScreenshot.width} × {currentScreenshot.height} px</span>
              </div>
              <div>
                <span className="text-neutral-400">Taille:</span>
                <span className="ml-2 font-medium">{formatFileSize(currentScreenshot.bytes)}</span>
              </div>
            </div>
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(currentScreenshot)}
                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
              >
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export { ScreenshotPreviewModal }