import React, { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { CommentsSection } from '@/components/organisms/CommentsSection'
import { EventHistorySection } from '@/components/organisms/EventHistorySection'
import { parseProperties } from '@/utils/properties'
import type { Event } from '@/types'

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
  productId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)

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
    { id: 'comments', label: 'Commentaires' },
    { id: 'history', label: 'Historique' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event: ${event.name}`}
      size="xl"
    >
      <div className="space-y-6">

        {/* Tabs */}
        <div className="border-b border-neutral-200">
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
                {tab.count && (
                  <span className="ml-2 bg-neutral-100 text-neutral-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
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
                    {event.status}
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
            <CommentsSection eventId={event.id} />
          )}

          {activeTab === 'history' && (
            <EventHistorySection eventId={event.id} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t border-neutral-200">
          {onEdit && (
            <Button variant="primary" onClick={() => onEdit(event)}>
              Modifier l'event
            </Button>
          )}
          <div className={`flex space-x-3 ${!onEdit ? 'w-full justify-end' : 'ml-auto'}`}>
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