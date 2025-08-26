import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateEventModal } from '@/components/organisms/CreateEventModal'
import { EditEventModal } from '@/components/organisms/EditEventModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { mockData } from '@/services/api'
import type { Page, Event, Product, EventStatus, CreateEventRequest, UpdateEventRequest, UpdatePageRequest } from '@/types'

/**
 * Page Detail 
 * Shows page info with all its tracking events and management
 */
const PageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [page, setPage] = useState<Page | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [createEventLoading, setCreateEventLoading] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [editEventLoading, setEditEventLoading] = useState(false)
  const [showAllEventsPreview, setShowAllEventsPreview] = useState(false)
  const [showEditPageModal, setShowEditPageModal] = useState(false)
  const [editPageLoading, setEditPageLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadPage(id)
      loadEvents(id)
    }
  }, [id])

  const loadPage = async (pageId: string) => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await pagesApi.getById(pageId)
      // setPage(response.data)
      
      // Mock data simulation
      const mockPage = mockData.pages.find(p => p.id === pageId)
      if (mockPage) {
        setPage(mockPage)
        // Load associated product
        const mockProduct = mockData.products.find(p => p.id === mockPage.product_id)
        setProduct(mockProduct || null)
      } else {
        navigate('/products', { replace: true })
      }
    } catch (error) {
      console.error('Error loading page:', error)
      navigate('/products', { replace: true })
    }
  }

  const loadEvents = async (pageId: string) => {
    try {
      // TODO: Replace with real API call
      // const response = await eventsApi.getByPage(pageId)
      // setEvents(response.data)
      
      // Mock data simulation
      const mockEvents = mockData.events.filter(e => e.page_id === pageId)
      setEvents(mockEvents)
      setLoading(false)
    } catch (error) {
      console.error('Error loading events:', error)
      setLoading(false)
    }
  }

  const handleCreateEvent = () => {
    setShowCreateEventModal(true)
  }

  const handleCreateEventSubmit = async (data: CreateEventRequest) => {
    if (!id) return
    
    setCreateEventLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await eventsApi.create(id, data)
      
      // Mock data simulation
      const newEvent: Event = {
        id: String(Date.now()),
        page_id: id,
        name: data.name,
        status: data.status || 'to_implement',
        variables: data.variables || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setEvents(prev => [newEvent, ...prev])
      mockData.events.push(newEvent)
      console.log('Event created:', newEvent)
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

  const handleEditEventSubmit = async (id: string, data: UpdateEventRequest) => {
    setEditEventLoading(true)
    try {
      // Update in global mockData and reload
      const updatedEvent = { ...data, updated_at: new Date().toISOString() }
      const index = mockData.events.findIndex(e => e.id === id)
      if (index !== -1) {
        mockData.events[index] = { ...mockData.events[index], ...updatedEvent }
      }
      // Reload events from mockData
      const updatedEvents = mockData.events.filter(e => e.page_id === page?.id)
      setEvents(updatedEvents)
      console.log('Event updated:', { id, ...data })
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    } finally {
      setEditEventLoading(false)
    }
  }

  const handleEditPageSubmit = async (id: string, data: UpdatePageRequest) => {
    setEditPageLoading(true)
    try {
      // Update in global mockData and reload
      const updatedPage = { ...data, updated_at: new Date().toISOString() }
      const index = mockData.pages.findIndex(p => p.id === id)
      if (index !== -1) {
        mockData.pages[index] = { ...mockData.pages[index], ...updatedPage }
        // Update local page state
        setPage({ ...mockData.pages[index] })
      }
      console.log('Page updated:', { id, ...data })
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
        // TODO: Replace with real API call
        // await eventsApi.delete(event.id)
        
        // Mock data simulation
        setEvents(prev => prev.filter(e => e.id !== event.id))
        const index = mockData.events.findIndex(e => e.id === event.id)
        if (index !== -1) {
          mockData.events.splice(index, 1)
        }
        console.log('Event deleted:', event)
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const handleUpdateStatus = (event: Event, newStatus: EventStatus) => {
    console.log('Update event status:', event.id, newStatus)
    // TODO: Implement status update
    const updatedEvents = events.map(e => 
      e.id === event.id ? { ...e, status: newStatus } : e
    )
    setEvents(updatedEvents)
  }

  if (!page || !product) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-neutral-900">Page introuvable</h2>
          <p className="text-neutral-600 mt-2">Cette page n'existe pas ou a été supprimée.</p>
          <Link to="/products" className="inline-block mt-4">
            <Button variant="primary">← Retour aux produits</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Events table columns with expandable variables
  const columns: Column<Event>[] = [
    {
      key: 'name',
      title: 'Event',
      render: (value, record) => (
        <div>
          <div className="font-medium text-neutral-900 font-mono">{value}</div>
          <div className="text-xs text-neutral-500 mt-1">
            {Object.keys(record.variables || {}).length} variable{Object.keys(record.variables || {}).length !== 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Statut',
      width: '140px',
      render: (value) => <Badge status={value as EventStatus}>{value}</Badge>,
    },
    {
      key: 'test_date',
      title: 'Date de test',
      width: '120px',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'updated_at',
      title: 'Modifié',
      width: '120px',
    },
  ]

  // Events table actions with status updates
  const actions: Action<Event>[] = [
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

  // Status stats
  const statusStats = events.reduce((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1
    return acc
  }, {} as Record<EventStatus, number>)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-neutral-600">
        <Link to="/products" className="hover:text-neutral-900">Produits</Link>
        <span>›</span>
        <Link to={`/products/${product.id}`} className="hover:text-neutral-900">{product.name}</Link>
        <span>›</span>
        <span className="text-neutral-900 font-medium">{page.name}</span>
      </nav>

      {/* Page Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{page.name}</h1>
            <p className="text-neutral-600 mt-1 font-mono text-sm">{page.url}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={() => setShowEditPageModal(true)}>
              Modifier la page
            </Button>
            <Button onClick={handleCreateEvent}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un event
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">{events.length}</div>
            <div className="text-sm text-neutral-600">Events totaux</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-700">{statusStats.to_implement || 0}</div>
            <div className="text-sm text-yellow-600">À implémenter</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-700">{statusStats.to_test || 0}</div>
            <div className="text-sm text-blue-600">À tester</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700">{statusStats.validated || 0}</div>
            <div className="text-sm text-green-600">Validés</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-700">{statusStats.error || 0}</div>
            <div className="text-sm text-red-600">Erreurs</div>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="bg-white rounded-lg border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Events de tracking</h2>
              <p className="text-neutral-600 text-sm mt-1">
                Gérez les événements GA4 de cette page
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Status filter buttons */}
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline">
                  <Badge status="to_implement" className="mr-1" />
                  Implémenter
                </Button>
                <Button size="sm" variant="outline">
                  <Badge status="to_test" className="mr-1" />
                  Tester
                </Button>
                <Button size="sm" variant="outline">
                  <Badge status="error" className="mr-1" />
                  Erreur
                </Button>
              </div>
              <Button onClick={handleCreateEvent} size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouvel event
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <DataTable
            data={events}
            columns={columns}
            actions={actions}
            loading={loading}
            emptyMessage="Aucun event trouvé. Créez votre premier événement de tracking."
            onRowClick={(event) => console.log('View event details:', event)}
          />
        </div>
      </div>

      {/* Variables Preview for selected events */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Aperçu des variables
          </h3>
          <div className="space-y-4">
            {(showAllEventsPreview ? events : events.slice(0, 2)).map((event) => (
              <div key={event.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-medium">{event.name}</span>
                    <Badge status={event.status as EventStatus}>{event.status}</Badge>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleEditEvent(event)}
                  >
                    Modifier →
                  </Button>
                </div>
                <div className="bg-neutral-50 rounded p-3">
                  <pre className="text-sm text-neutral-700">
                    {JSON.stringify(event.variables, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setShowAllEventsPreview(!showAllEventsPreview)}
                >
                  {showAllEventsPreview 
                    ? 'Réduire l\'aperçu' 
                    : `Voir tous les events (${events.length - 2} autres)`
                  }
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-between items-center pt-4">
        <Link to={`/products/${product.id}`}>
          <Button variant="outline">
            ← Retour au produit
          </Button>
        </Link>
        <div className="text-sm text-neutral-500">
          Page créée le {new Date(page.created_at).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onSubmit={handleCreateEventSubmit}
        loading={createEventLoading}
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
        isOpen={showEditPageModal}
        page={page}
        onClose={() => setShowEditPageModal(false)}
        onSubmit={handleEditPageSubmit}
        loading={editPageLoading}
      />
    </div>
  )
}

export { PageDetail }