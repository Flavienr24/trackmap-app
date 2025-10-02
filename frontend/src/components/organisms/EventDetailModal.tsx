import React, { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CommentsSection } from '@/components/organisms/CommentsSection'
import { EventHistorySection } from '@/components/organisms/EventHistorySection'
import { DragDropZone, type FileWithProgress } from '@/components/molecules/DragDropZone'
import { ScreenshotPreviewModal } from '@/components/molecules/ScreenshotPreviewModal'
import { ScreenshotThumbnail } from '@/components/molecules/ScreenshotThumbnail'
import { parseProperties, getStatusLabel } from '@/utils/properties'
import { uploadMultipleFilesWithProgress } from '@/utils/uploadUtils'
import { deleteScreenshot } from '@/utils/screenshotUtils'
import type { Event, Screenshot } from '@/types'

// Copy icon component
const CopyIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
    />
  </svg>
)

interface EventDetailModalProps {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onEdit?: (event: Event) => void
  onEventUpdate?: (updatedEvent: Event) => void
}

type TabType = 'details' | 'comments' | 'history'


/**
 * Event Detail Modal
 * Shows event details with tabs for Details, Comments, and History
 */
const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onEventUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const [commentsCount, setCommentsCount] = useState<number>(0)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [uploading] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(event)

  // Copy properties to clipboard function
  const copyPropertiesToClipboard = async () => {
    if (!event) return

    const parsedProperties = parseProperties(event.properties)
    const allEntries = [
      ['event', event.name],
      ...Object.entries(parsedProperties).filter(([key]) => key !== 'event')
    ]

    // Format as key: value with line breaks
    const formattedProperties = allEntries
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join('\n')

    try {
      await navigator.clipboard.writeText(formattedProperties)
      // Show copied tooltip
      setShowCopiedTooltip(true)
      setTimeout(() => setShowCopiedTooltip(false), 2000)
    } catch (err) {
      console.error('Failed to copy properties to clipboard:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = formattedProperties
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      // Show copied tooltip for fallback too
      setShowCopiedTooltip(true)
      setTimeout(() => setShowCopiedTooltip(false), 2000)
    }
  }

  // Handle files selected for drag & drop
  const handleFilesSelected = (files: File[]) => {
    // Files are selected, upload will be handled by onUpload
    console.log('Files selected for upload:', files.length)
  }

  // Handle upload with progress for drag & drop
  const handleUploadWithProgress = async (
    filesWithProgress: FileWithProgress[],
    setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void
  ): Promise<any[]> => {
    if (!currentEvent) return []

    try {
      const results = await uploadMultipleFilesWithProgress(
        currentEvent.id,
        filesWithProgress,
        setProgress
      )

      // Extract screenshots from results
      const newScreenshots = results
        .filter(result => result.success && result.data?.screenshots)
        .flatMap(result => result.data.screenshots)

      if (newScreenshots.length > 0) {
        const updatedEvent = {
          ...currentEvent,
          screenshots: [...(currentEvent.screenshots || []), ...newScreenshots]
        }
        
        setCurrentEvent(updatedEvent)
        if (onEventUpdate) {
          onEventUpdate(updatedEvent)
        }
      }

      return results
    } catch (error) {
      console.error('Error uploading screenshots:', error)
      throw error
    }
  }


  // Handle screenshot preview
  const openScreenshotPreview = (screenshot: Screenshot) => {
    const index = currentEvent?.screenshots?.findIndex(s => s.public_id === screenshot.public_id) ?? 0
    setCurrentPreviewIndex(index)
    setSelectedScreenshot(screenshot)
    setPreviewModalOpen(true)
  }

  // Navigate preview modal
  const navigatePreview = (direction: 'prev' | 'next') => {
    if (!currentEvent?.screenshots) return
    
    let newIndex = currentPreviewIndex
    if (direction === 'prev' && currentPreviewIndex > 0) {
      newIndex = currentPreviewIndex - 1
    } else if (direction === 'next' && currentPreviewIndex < currentEvent.screenshots.length - 1) {
      newIndex = currentPreviewIndex + 1
    }
    
    setCurrentPreviewIndex(newIndex)
    setSelectedScreenshot(currentEvent.screenshots[newIndex])
  }

  // Close preview modal
  const closePreviewModal = () => {
    setPreviewModalOpen(false)
    setSelectedScreenshot(null)
  }

  // Handle screenshot deletion
  const handleDeleteScreenshot = async (screenshotToDelete: Screenshot) => {
    if (!currentEvent) return

    try {
      await deleteScreenshot(currentEvent.id, screenshotToDelete)

      const updatedEvent = {
        ...currentEvent,
        screenshots: currentEvent.screenshots?.filter(s => s.public_id !== screenshotToDelete.public_id) || []
      }

      setCurrentEvent(updatedEvent)
      if (onEventUpdate) {
        onEventUpdate(updatedEvent)
      }

      // Close preview if deleted screenshot was selected
      if (selectedScreenshot?.public_id === screenshotToDelete.public_id) {
        setSelectedScreenshot(null)
        setPreviewModalOpen(false)
      }
    } catch (error) {
      console.error('Error deleting screenshot:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'image'
      alert(errorMessage)
    }
  }


  // Update currentEvent when event prop changes
  React.useEffect(() => {
    setCurrentEvent(event)
  }, [event])

  if (!event || !currentEvent) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'details', label: 'Détails' },
    { id: 'comments', label: 'Commentaires', count: commentsCount },
    { id: 'history', label: 'Historique' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event: ${event.name}`}
      size="2xl"
      fixedHeight={true}
    >
      <div className="flex flex-col h-full">

        {/* Tabs */}
        <div className="border-b border-neutral-200 flex-shrink-0">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1">
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Nom de l'événement</h3>
                  <p className="text-neutral-900 font-mono">{event.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Statut</h3>
                  <Badge status={event.status}>
                    {getStatusLabel(event.status)}
                  </Badge>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Créé le</h3>
                  <p className="text-neutral-900">{formatDate(event.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Modifié le</h3>
                  <p className="text-neutral-900">{formatDate(event.updated_at)}</p>
                </div>
              </div>

              {/* Test Date */}
              {event.test_date && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Date de test</h3>
                  <p className="text-neutral-900">
                    {new Date(event.test_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}

              {/* Properties */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-600">Propriétés</h3>
                  <div className="relative">
                    <button
                      onClick={copyPropertiesToClipboard}
                      className="flex items-center space-x-1 text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
                      title="Copier les propriétés dans le presse-papier"
                    >
                      <CopyIcon className="w-4 h-4" />
                    </button>
                    {/* Copied tooltip */}
                    <div 
                      className={`absolute -top-10 right-0 bg-neutral-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap ${
                        showCopiedTooltip 
                          ? 'opacity-100 transform translate-y-0 scale-100' 
                          : 'opacity-0 transform translate-y-1 scale-95 pointer-events-none'
                      }`}
                      style={{
                        transition: 'opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        transformOrigin: 'center bottom'
                      }}
                    >
                      Copié !
                      {/* Small arrow pointing down */}
                      <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent border-t-neutral-800"></div>
                    </div>
                  </div>
                </div>
                {(() => {
                  const parsedProperties = parseProperties(event.properties)
                  // Always show event name as first property, then other properties
                  const allEntries = [
                    ['event', event.name],
                    ...Object.entries(parsedProperties).filter(([key]) => key !== 'event')
                  ]
                  
                  return (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                      <div className="space-y-2">
                        {allEntries.map(([key, value]) => (
                          <div key={key} className="flex items-start">
                            <div className="font-medium text-neutral-700 w-1/3 font-mono text-sm">
                              {key}:
                            </div>
                            <div className="text-neutral-900 flex-1 font-mono text-sm">
                              {typeof value === 'string' ? value : JSON.stringify(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Screenshots Section */}
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3">
                  Screenshots ({currentEvent.screenshots?.length || 0})
                </h3>
                

                {/* Drag & Drop Upload Zone */}
                <div className="mb-4">
                  <DragDropZone
                    onFilesSelected={handleFilesSelected}
                    onUpload={handleUploadWithProgress}
                    accept="image/*"
                    maxFiles={10}
                    maxSize={5 * 1024 * 1024}
                    disabled={uploading}
                    className="p-6"
                    multiple={true}
                    showProgress={true}
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-neutral-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="text-sm text-neutral-600 mb-1">
                        <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                          Cliquez pour uploader
                        </span>
                        <span> ou glissez-déposez vos fichiers</span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Images et PDF jusqu'à 5MB
                      </p>
                    </div>
                  </DragDropZone>
                </div>

                {/* Existing screenshots thumbnails */}
                {currentEvent.screenshots && currentEvent.screenshots.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {currentEvent.screenshots.map((screenshot, index) => (
                      <ScreenshotThumbnail
                        key={screenshot.public_id}
                        screenshot={screenshot}
                        index={index}
                        onClick={openScreenshotPreview}
                        onDelete={handleDeleteScreenshot}
                        disabled={uploading}
                        showFullscreenIcon={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <CommentsSection 
              eventId={event.id} 
              onCommentsCountChange={setCommentsCount}
            />
          )}

          {activeTab === 'history' && (
            <EventHistorySection eventId={event.id} event={event} />
          )}

        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex justify-between pt-4 border-t border-neutral-200 flex-shrink-0 bg-white">
          {onEdit && activeTab !== 'comments' && activeTab !== 'history' && (
            <Button variant="primary" onClick={() => onEdit(event)}>
              Modifier l'event
            </Button>
          )}
          <div className={`flex space-x-3 ${!onEdit || activeTab === 'comments' || activeTab === 'history' ? 'w-full justify-end' : 'ml-auto'}`}>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>

      {/* Screenshot Preview Modal */}
      {currentEvent?.screenshots && currentEvent.screenshots.length > 0 && (
        <ScreenshotPreviewModal
          isOpen={previewModalOpen}
          screenshots={currentEvent.screenshots}
          currentIndex={currentPreviewIndex}
          onClose={closePreviewModal}
          onDelete={handleDeleteScreenshot}
          onNavigate={navigatePreview}
        />
      )}
    </Modal>
  )
}

export { EventDetailModal }