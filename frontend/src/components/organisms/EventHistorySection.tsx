import React, { useState, useEffect } from 'react'
// import { mockData } from '@/services/api' // Removed - using real API
import type { EventHistory } from '@/types'

interface EventHistorySectionProps {
  eventId: string
  className?: string
}

/**
 * Event History Section Component
 * Displays the history of changes for a specific event
 * Read-only component showing audit trail
 */
const EventHistorySection: React.FC<EventHistorySectionProps> = ({
  eventId,
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
      // TODO: Replace with real API call
      // const response = await eventHistoryApi.getByEvent(eventId)
      // setHistory(response.data)
      
      // Mock data simulation
      setTimeout(() => {
        const eventHistory = mockData.eventHistory
          .filter(h => h.event_id === eventId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setHistory(eventHistory)
        setLoading(false)
      }, 200)
    } catch (error) {
      console.error('Error loading event history:', error)
      setLoading(false)
    }
  }

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

  const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      'status': 'Statut',
      'name': 'Nom',
      'variables': 'Variables',
      'test_date': 'Date de test',
    }
    return fieldNames[field] || field
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

  const getChangeIcon = (field: string) => {
    switch (field) {
      case 'status':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'variables':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      case 'test_date':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
    }
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
      <h3 className="text-lg font-medium text-neutral-900">
        Historique des modifications ({history.length})
      </h3>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <div className="text-4xl mb-2">📋</div>
          <p>Aucune modification enregistrée.</p>
          <p className="text-sm">L'historique des modifications apparaîtra ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline line */}
              {index < history.length - 1 && (
                <div className="absolute left-6 top-12 w-px h-16 bg-neutral-200" />
              )}
              
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  {getChangeIcon(entry.field)}
                </div>
                
                {/* Content */}
                <div className="flex-1 bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-neutral-900">
                        Modification du champ "{formatFieldName(entry.field)}"
                      </div>
                      <div className="text-sm text-neutral-500">
                        {formatDate(entry.created_at)}
                        {entry.author && (
                          <span> • Par {entry.author}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Change Details */}
                  <div className="space-y-2">
                    {entry.old_value && (
                      <div>
                        <div className="text-sm font-medium text-neutral-600 mb-1">Ancienne valeur :</div>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm font-mono text-red-800">
                          {formatValue(entry.old_value)}
                        </div>
                      </div>
                    )}
                    
                    {entry.new_value && (
                      <div>
                        <div className="text-sm font-medium text-neutral-600 mb-1">Nouvelle valeur :</div>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm font-mono text-green-800">
                          {formatValue(entry.new_value)}
                        </div>
                      </div>
                    )}
                    
                    {!entry.old_value && !entry.new_value && (
                      <div className="text-sm text-neutral-500 italic">
                        Aucun détail de modification disponible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Footer info */}
      {history.length > 0 && (
        <div className="text-sm text-neutral-500 text-center pt-4 border-t border-neutral-200">
          L'historique est généré automatiquement à chaque modification
        </div>
      )}
    </div>
  )
}

export { EventHistorySection }