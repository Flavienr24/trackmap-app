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
import { pagesApi, eventsApi, productsApi } from '@/services/api'
import { getPropertyCount, getStatusLabel } from '@/utils/properties'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Page, Event, EventStatus, CreateEventRequest, UpdateEventRequest, UpdatePageRequest } from '@/types'

/**
 * Page Detail 
 * Shows page info with all its tracking events and management
 */
const PageDetail: React.FC = () => {
  const { productName, pageSlug } = useParams<{ productName: string; pageSlug: string }>()
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

  // Find product by matching slug against product name
  const findProductBySlug = useCallback(async (productSlug: string) => {
    try {
      // Get all products and find the one that matches the slug
      const allProductsResponse = await productsApi.getAll()
      const targetProduct = allProductsResponse.data.find(product => 
        doesProductNameMatchSlug(product.name, productSlug)
      )
      return targetProduct
    } catch (error) {
      console.error('Error finding product by slug:', error)
      return null
    }
  }, [])

  // Load page and events data
  useEffect(() => {
    if (!productName || !pageSlug) return
    
    const loadAllData = async () => {
      setLoading(true)
      try {
        // First find the product by slug
        const product = await findProductBySlug(productName)
        if (!product) {
          console.error('Product not found for slug:', productName)
          navigate('/products', { replace: true })
          return
        }
        
        // Then load page using product ID and page slug
        const pageResponse = await pagesApi.getBySlug(product.id, pageSlug)
        setPage(pageResponse.data)
        
        // Finally load events for that page
        if (pageResponse.data?.id) {
          const eventsResponse = await eventsApi.getByPage(pageResponse.data.id)
          setEvents(eventsResponse.data)
        }
      } catch (error) {
        console.error('Error loading page or events:', error)
        navigate('/products', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    
    loadAllData()
  }, [productName, pageSlug, navigate, findProductBySlug])

  const loadEvents = useCallback(async (pageId: string) => {
    try {
      const eventsResponse = await eventsApi.getByPage(pageId)
      setEvents(eventsResponse.data)
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }, [])

  const handleCreateEvent = () => {
    setShowCreateEventModal(true)
  }

  const handleCreateEventSubmit = async (data: CreateEventRequest) => {
    if (!page?.id) return
    
    setCreateEventLoading(true)
    try {
      const response = await eventsApi.create(page.id, data)
      console.log('Event created:', response.data)
      await loadEvents(page.id) // Reload the list
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

  const handleEditEventFromDetail = (event: Event) => {
    setSelectedEvent(null) // Fermer le modal de détail
    setEditEvent(event)    // Ouvrir le modal d'édition
  }

  const handleEditEventSubmit = async (eventId: string, data: UpdateEventRequest) => {
    setEditEventLoading(true)
    try {
      const response = await eventsApi.update(eventId, data)
      console.log('Event updated:', response.data)
      if (page?.id) {
        await loadEvents(page.id) // Reload the list
      }
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
      if (productName && pageSlug) {
        // Find the product first, then reload the page data
        const product = await findProductBySlug(productName)
        if (product) {
          const pageResponse = await pagesApi.getBySlug(product.id, pageSlug)
          setPage(pageResponse.data)
        }
      }
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
        if (page?.id) {
          await loadEvents(page.id) // Reload the list
        }
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event)
  }

  const handleStatusChange = async (event: Event, newStatus: EventStatus) => {
    try {
      const response = await eventsApi.update(event.id, { status: newStatus })
      console.log('Event status updated:', response.data)
      if (page?.id) {
        await loadEvents(page.id) // Reload the list
      }
    } catch (error) {
      console.error('Error updating event status:', error)
    }
  }

  if (!productName || !pageSlug) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-neutral-900">Paramètres manquants</h2>
          <p className="text-neutral-600 mt-2">Les paramètres de produit et de page sont requis.</p>
          <Link to="/products" className="inline-block mt-4">
            <Button variant="primary">← Retour aux produits</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-600">Chargement de la page...</p>
        </div>
      </div>
    )
  }

  if (!page) {
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


  // Table columns configuration
  const columns: Column<Event>[] = [
    {
      key: 'name',
      title: 'Event',
      render: (value, record) => {
        const variableCount = getPropertyCount(record.properties)
        
        return (
          <div>
            <div className="font-medium text-neutral-900">{value}</div>
            <div className="text-sm text-neutral-500">
              {variableCount} propriété{variableCount !== 1 ? 's' : ''}
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      title: 'Statut',
      width: '120px',
      render: (value, record) => (
        <Badge 
          status={value as EventStatus} 
          showDropdownArrow={true}
          onStatusChange={(newStatus) => handleStatusChange(record, newStatus)}
        >
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
      label: 'Modifier',
      onClick: handleEditEvent,
      iconOnly: true,
      icon: (
        <svg className="w-4 h-4 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to={`/products/${page.product?.id || page.product_id}`}>Retour au produit</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <Link to={`/products/${page.product?.id || page.product_id}`} className="hover:text-neutral-900">Produit</Link>
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
        onStatusChange={handleStatusChange}
        enableSort={true}
        sortContext="events"
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
        pageId={page?.id}
        productId={page?.product_id}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={!!editEvent}
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSubmit={handleEditEventSubmit}
        onDelete={handleDeleteEvent}
        loading={editEventLoading}
        productId={page?.product_id}
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
        onEdit={handleEditEventFromDetail}
        productId={page.product_id}
      />
    </div>
  )
}

export { PageDetail }