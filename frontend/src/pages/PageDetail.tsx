import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateEventModal } from '@/components/organisms/CreateEventModal'
import { EditEventModal } from '@/components/organisms/EditEventModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { EventDetailModal } from '@/components/organisms/EventDetailModal'
import { pagesApi, eventsApi } from '@/services/api'
import { getVariableCount } from '@/utils/variables'
import type { Page, Event, Product, EventStatus, CreateEventRequest, UpdateEventRequest, UpdatePageRequest } from '@/types'

/**
 * Page Detail 
 * Shows page info with all its tracking events and management
 */
const PageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [page, setPage] = useState<Page | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [createEventLoading, setCreateEventLoading] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [editEventLoading, setEditEventLoading] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [editPageLoading, setEditPageLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const loadPage = useCallback(async (pageId: string) => {
    try {
      const response = await pagesApi.getById(pageId)
      setPage(response.data)
    } catch (error) {
      console.error('Error loading page:', error)
    }
  }, [])

  const loadEvents = useCallback(async (pageId: string) => {
    try {
      const response = await eventsApi.getByPage(pageId)
      setEvents(response.data)
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    try {
      await Promise.all([
        loadPage(id),
        loadEvents(id)
      ])
    } finally {
      setLoading(false)
    }
  }, [id, loadPage, loadEvents])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateEvent = () => {
    setShowCreateEventModal(true)
  }

  const handleCreateEventSubmit = async (data: CreateEventRequest) => {
    if (!id) return
    
    setCreateEventLoading(true)
    try {
      const response = await eventsApi.create(id, data)
      console.log('Event created:', response.data)
      await loadEvents(id) // Reload the list
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    } finally {
      setCreateEventLoading(false)
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditEvent(event)
  }

  const handleEditEventSubmit = async (eventId: string, data: UpdateEventRequest) => {
    setEditEventLoading(true)
    try {
      const response = await eventsApi.update(eventId, data)
      console.log('Event updated:', response.data)
      await loadEvents(id!) // Reload the list
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    } finally {
      setEditEventLoading(false)
    }
  }

  const handleEditPage = () => {
    if (page) {
      setEditPage(page)
    }
  }

  const handleEditPageSubmit = async (pageId: string, data: UpdatePageRequest) => {
    setEditPageLoading(true)
    try {
      const response = await pagesApi.update(pageId, data)
      console.log('Page updated:', response.data)
      await loadPage(id!) // Reload the page data
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    } finally {
      setEditPageLoading(false)
    }
  }

  const handleDeleteEvent = async (event: Event) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'event "${event.name}" ?`)) {
      try {
        await eventsApi.delete(event.id)
        console.log('Event deleted:', event)
        await loadEvents(id!) // Reload the list
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event)
  }

  if (!id) {
    return <div>Page ID manquant</div>
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!page) {
    return <div>Page non trouvée</div>
  }

  // Status color mapping
  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'validated': return 'success'
      case 'to_test': return 'warning' 
      case 'error': return 'danger'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: EventStatus) => {
    switch (status) {
      case 'to_implement': return 'À implémenter'
      case 'to_test': return 'À tester'
      case 'validated': return 'Validé'
      case 'error': return 'Erreur'
      default: return status
    }
  }

  // Table columns configuration
  const columns: Column<Event>[] = [
    {
      key: 'name',
      title: 'Event',
      render: (value, record) => {
        const variableCount = getVariableCount(record.variables)
        
        return (
          <div>
            <div className="font-medium text-neutral-900">{value}</div>
            <div className="text-sm text-neutral-500">
              {variableCount} variable{variableCount !== 1 ? 's' : ''}
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      title: 'Statut',
      width: '120px',
      render: (value) => (
        <Badge variant={getStatusColor(value as EventStatus)}>
          {getStatusLabel(value as EventStatus)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: 'Créé le',
      width: '140px',
    },
    {
      key: 'updated_at',
      title: 'Modifié le',
      width: '140px',
    },
  ]

  // Table actions
  const actions: Action<Event>[] = [
    {
      label: 'Voir',
      onClick: handleViewEvent,
      variant: 'primary',
    },
    {
      label: 'Modifier',
      onClick: handleEditEvent,
      variant: 'secondary',
    },
    {
      label: 'Supprimer',
      onClick: handleDeleteEvent,
      variant: 'danger',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to={`/products/${page.product_id}`}>Retour au produit</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <Link to={`/products/${page.product_id}`} className="hover:text-neutral-900">Produit</Link>
          <span>›</span>
          <span className="text-neutral-900 font-medium">{page.name}</span>
        </nav>
      </div>

      {/* Page Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{page.name}</h1>
            <p className="text-neutral-600 mt-1">{page.url}</p>
            <div className="flex items-center space-x-4 mt-4">
              <div className="text-sm text-neutral-500">
                <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleEditPage}>
              Modifier la page
            </Button>
            <Button variant="primary" onClick={handleCreateEvent}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer un event
            </Button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <DataTable
        data={events}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Aucun event trouvé. Créez votre premier event pour cette page."
        onRowClick={handleViewEvent}
      />

      {/* Stats Footer */}
      {!loading && events.length > 0 && (
        <div className="text-sm text-neutral-500">
          {events.length} event{events.length !== 1 ? 's' : ''} sur cette page
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onSubmit={handleCreateEventSubmit}
        loading={createEventLoading}
        pageId={id}
        productId={page.product_id}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={!!editEvent}
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSubmit={handleEditEventSubmit}
        loading={editEventLoading}
      />

      {/* Edit Page Modal */}
      <EditPageModal
        isOpen={!!editPage}
        page={editPage}
        onClose={() => setEditPage(null)}
        onSubmit={handleEditPageSubmit}
        loading={editPageLoading}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        productId={page.product_id}
      />
    </div>
  )
}

export { PageDetail }