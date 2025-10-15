import React, { useState, useEffect } from 'react'
import { eventHistoryApi } from '@/services/api'
import type { EventHistory, Event } from '@/types'

interface EventHistorySectionProps {
  eventId: string
  event?: Event
  className?: string
}

/**
 * Event History Section Component
 * Displays the history of changes for a specific event
 * Read-only component showing audit trail
 */
const EventHistorySection: React.FC<EventHistorySectionProps> = ({
  eventId,
  event,
  className = '',
}) => {
  const [history, setHistory] = useState<EventHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [eventId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await eventHistoryApi.getByEvent(eventId)
      let historyEntries = [...response.data]
      
      // Add creation event if we have event data
      if (event) {
        const creationEntry: EventHistory = {
          id: 'creation-' + event.id,
          event_id: event.id,
          field: 'creation',
          old_value: undefined,
          new_value: event.name,
          author: 'system',
          created_at: (event as any).created_at ?? event.createdAt ?? new Date().toISOString()
        }
        historyEntries = [...historyEntries, creationEntry]
      }
      
      // Sort by date (most recent first)
      historyEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setHistory(historyEntries)
      setLoading(false)
    } catch (error) {
      console.error('Error loading event history:', error)
      setHistory([]) // Set empty array on error
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Il y a quelques minutes'
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} heure${Math.floor(diffInHours) > 1 ? 's' : ''}`
    } else if (diffInHours < 24 * 7) {
      return `Il y a ${Math.floor(diffInHours / 24)} jour${Math.floor(diffInHours / 24) > 1 ? 's' : ''}`
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    }
  }

  const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      'status': 'Statut',
      'name': 'Nom', 
      'variables': 'Variables',
      'test_date': 'Date de test',
      'creation': 'Création',
    }
    return fieldNames[field] || field
  }

  const getFieldDescription = (entry: EventHistory): string => {
    if (entry.field === 'creation') {
      return `Événement créé`
    }
    return `${formatFieldName(entry.field)} modifié`
  }

  const formatValue = (value: string | null): string => {
    if (value === null || value === undefined) {
      return '-'
    }
    
    // Try to parse JSON for variables
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    
    return value
  }


  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
          <div className="h-20 bg-neutral-200 rounded"></div>
          <div className="h-20 bg-neutral-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-neutral-900">
          Historique ({history.length})
        </h3>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <div className="text-4xl mb-2">📋</div>
          <p>Aucune modification enregistrée.</p>
        </div>
      ) : (
        <div>
          {history.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg p-4">
              <div className="flex items-start space-x-2 flex-1">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-blue-800">
                    {entry.author ? entry.author.charAt(0).toUpperCase() : 'S'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="mb-1">
                    <div className="font-semibold text-sm text-neutral-900">
                      {entry.author || 'Système'}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-700">
                    {getFieldDescription(entry)}
                    {entry.field !== 'creation' && entry.old_value && entry.new_value && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-neutral-500">
                          De <span className="font-mono bg-red-50 px-1 rounded text-red-700">{formatValue(entry.old_value)}</span>
                          {' '}vers <span className="font-mono bg-green-50 px-1 rounded text-green-700">{formatValue(entry.new_value)}</span>
                        </div>
                      </div>
                    )}
                    {entry.field === 'creation' && (
                      <div className="text-xs text-neutral-500 mt-1">
                        Nom: <span className="font-mono">{entry.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { EventHistorySection }
