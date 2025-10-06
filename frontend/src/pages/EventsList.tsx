import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/organisms/DataTable'
import { pagesApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Page } from '@/types'

// Type for flattened event data
interface EventData {
  id: string
  name: string
  type: string
  pageName: string
  pageId: string
  properties: any
  created_at: string
  updated_at: string
}

/**
 * Events List Page
 * Shows all events across all pages for the selected product
 */
const EventsList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const { currentProduct, setCurrentProductBySlug, hasSelectedProduct } = useProduct()
  
  const [pages, setPages] = useState<Page[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')

  // Load data
  const loadData = useCallback(async () => {
    if (!currentProduct) return
    
    setLoading(true)
    try {
      const response = await pagesApi.getByProduct(currentProduct.id)
      const pagesData = response.data
      setPages(pagesData)
      
      // Flatten all events from all pages
      const allEvents: EventData[] = []
      pagesData.forEach((page: any) => {
        if (page.events) {
          page.events.forEach((event: any) => {
            allEvents.push({
              id: event.id,
              name: event.name,
              type: event.type || 'Unknown',
              pageName: page.name,
              pageId: page.id,
              properties: event.properties,
              created_at: event.created_at,
              updated_at: event.updated_at,
            })
          })
        }
      })
      
      setEvents(allEvents)
      setFilteredEvents(allEvents)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }, [currentProduct])

  // Initialize product and load data
  useEffect(() => {
    if (productName) {
      // Always sync current product with URL slug to ensure consistency
      const productMatchesSlug = currentProduct &&
        doesProductNameMatchSlug(currentProduct.name, productName)

      if (!productMatchesSlug) {
        setCurrentProductBySlug(productName)
      }
    }
  }, [productName, currentProduct, setCurrentProductBySlug])

  useEffect(() => {
    if (currentProduct) {
      loadData()
    }
  }, [currentProduct, loadData])

  // Filter events based on search and type
  useEffect(() => {
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedType) {
      filtered = filtered.filter(event => event.type === selectedType)
    }

    setFilteredEvents(filtered)
  }, [events, searchQuery, selectedType])

  // Get unique event types for filter
  const eventTypes = Array.from(new Set(events.map(event => event.type)))

  if (!hasSelectedProduct || !currentProduct) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900">Produit non sélectionné</h2>
          <p className="text-slate-600 mt-2">Veuillez sélectionner un produit pour voir ses événements.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-slate-900">Chargement...</h2>
          <p className="text-slate-600 mt-2">Récupération des événements</p>
        </div>
      </div>
    )
  }

  // Table columns
  const columns: Column<EventData>[] = [
    {
      key: 'name',
      title: 'Nom de l\'événement',
      render: (value, record) => (
        <div>
          <div className="font-medium text-slate-900">{value}</div>
          <div className="text-sm text-slate-600">{record.pageName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: '120px',
      render: (value) => (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'properties',
      title: 'Propriétés',
      width: '100px',
      render: (value) => {
        let propertiesCount = 0
        if (value) {
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value
            propertiesCount = Object.keys(parsed || {}).length
          } catch (error) {
            propertiesCount = 0
          }
        }
        return (
          <span className="text-slate-600">{propertiesCount}</span>
        )
      },
    },
    {
      key: 'updated_at',
      title: 'Dernière modification',
      width: '160px',
      render: (value) => (
        <span className="text-slate-600">
          {new Date(value).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Événements - {currentProduct.name}
          </CardTitle>
          <CardDescription className="text-lg">
            Tous les événements de tracking configurés pour ce produit
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {events.length}
                </div>
                <div className="text-sm text-slate-600">Total événements</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {eventTypes.length}
                </div>
                <div className="text-sm text-slate-600">Types d'événements</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {pages.length}
                </div>
                <div className="text-sm text-slate-600">Pages concernées</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {Array.from(new Set(events.flatMap(event => {
                    try {
                      const props = typeof event.properties === 'string' 
                        ? JSON.parse(event.properties) 
                        : event.properties
                      return Object.keys(props || {})
                    } catch {
                      return []
                    }
                  }))).length}
                </div>
                <div className="text-sm text-slate-600">Propriétés uniques</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Type:</span>
              <select
                className="px-3 py-2 border rounded-md bg-background"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">Tous les types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              {(searchQuery || selectedType) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedType('')
                  }}
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredEvents}
            columns={columns}
            loading={loading}
            emptyMessage="Aucun événement trouvé pour ce produit."
          />
        </CardContent>
      </Card>

      {/* Stats Footer */}
      {filteredEvents.length > 0 && (
        <div className="text-sm text-slate-500 text-center">
          {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} 
          {(searchQuery || selectedType) && ` (filtré${filteredEvents.length !== 1 ? 's' : ''} sur ${events.length})`}
        </div>
      )}
    </div>
  )
}

export { EventsList }
export default EventsList