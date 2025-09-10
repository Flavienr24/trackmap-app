import React, { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { CommentsSection } from '@/components/organisms/CommentsSection'
import { EventHistorySection } from '@/components/organisms/EventHistorySection'
import { parseProperties, getStatusLabel } from '@/utils/properties'
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
  productId?: string
}

type TabType = 'details' | 'comments' | 'history' | 'screenshots'


/**
 * Event Detail Modal
 * Shows event details with tabs for Details, Comments, and History
 */
const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  productId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const [commentsCount, setCommentsCount] = useState<number>(0)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)

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

  if (!event) return null

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
    { id: 'screenshots', label: 'Screenshots' },
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

          {activeTab === 'screenshots' && (
            <div className="space-y-6">
              {/* Screenshots display */}
              {event.screenshots && event.screenshots.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {/* Selected screenshot preview */}
                  {selectedScreenshot && (
                    <div className="bg-white border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-neutral-600">Aperçu</h3>
                        <button
                          onClick={() => setSelectedScreenshot(null)}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors"
                          title="Fermer l'aperçu"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-neutral-50 rounded-lg p-4 flex justify-center">
                        <img
                          src={selectedScreenshot.secure_url}
                          alt="Screenshot preview"
                          className="max-w-full max-h-96 object-contain rounded border border-neutral-200"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-3 text-xs text-neutral-500 space-y-1">
                        <div>Format: {selectedScreenshot.format.toUpperCase()}</div>
                        <div>Dimensions: {selectedScreenshot.width} × {selectedScreenshot.height} px</div>
                        <div>Taille: {Math.round(selectedScreenshot.bytes / 1024)} KB</div>
                      </div>
                    </div>
                  )}

                  {/* Thumbnails grid */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-600 mb-3">
                      Screenshots ({event.screenshots.length})
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {event.screenshots.map((screenshot, index) => (
                        <button
                          key={screenshot.public_id}
                          onClick={() => setSelectedScreenshot(screenshot)}
                          className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                            selectedScreenshot?.public_id === screenshot.public_id
                              ? 'border-blue-500 shadow-md'
                              : 'border-neutral-200'
                          }`}
                          title={`Voir le screenshot ${index + 1}`}
                        >
                          <img
                            src={screenshot.thumbnail_url || screenshot.secure_url}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {/* Overlay with preview icon */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-neutral-900">Aucun screenshot</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Aucun screenshot n'a été ajouté à cet événement.
                  </p>
                </div>
              )}
            </div>
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
    </Modal>
  )
}

export { EventDetailModal }