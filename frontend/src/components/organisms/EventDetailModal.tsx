import React, { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { CommentsSection } from '@/components/organisms/CommentsSection'
import { EventHistorySection } from '@/components/organisms/EventHistorySection'
import { parseProperties } from '@/utils/properties'
import type { Event } from '@/types'

interface EventDetailModalProps {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onEdit?: (event: Event) => void
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
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details')

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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <div className="flex items-center space-x-4">
            <Badge status={event.status}>
              {event.status}
            </Badge>
            {event.test_date && (
              <div className="text-sm text-neutral-600">
                Testé le {new Date(event.test_date).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
          {onEdit && (
            <Button variant="secondary" onClick={() => onEdit(event)}>
              Modifier
            </Button>
          )}
        </div>

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
                <h3 className="text-sm font-medium text-neutral-600 mb-2">Propriétés</h3>
                {(() => {
                  const parsedProperties = parseProperties(event.variables)
                  
                  return Object.keys(parsedProperties).length > 0 ? (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                      <div className="space-y-2">
                        {Object.entries(parsedProperties).map(([key, value]) => (
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
                  ) : (
                    <p className="text-neutral-500 italic">Aucune variable définie</p>
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
        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export { EventDetailModal }