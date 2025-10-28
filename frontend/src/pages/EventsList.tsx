import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DataTable, type Column } from '@/components/organisms/DataTable'
import { CreateEventModal } from '@/components/organisms/CreateEventModal'
import { eventDefinitionsApi, eventsApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { CreateEventRequest, EventDefinition, EventDefinitionStats } from '@/types'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface EventDefinitionRow {
  id: string
  name: string
  description: string
  userInteractionType: string
  usageCount: number
  updatedAt: string
  createdAt: string
}

const INTERACTION_LABELS: Record<string, string> = {
  click: 'Clic',
  page_load: 'Chargement page',
  interaction: 'Interaction',
  form_submit: 'Formulaire',
  scroll: 'Scroll',
  other: 'Autre'
}

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-6xl mb-4">📚</div>
    <h3 className="text-xl font-semibold text-slate-900">Aucun événement référencé</h3>
    <p className="text-slate-600 mt-2 max-w-md">
      Commencez par créer une définition d&apos;événement pour documenter les interactions clés de votre produit.
    </p>
  </div>
)

const computeEventDefinitionStats = (items: EventDefinition[]): EventDefinitionStats => {
  const totalDefinitions = items.length
  const totalEvents = items.reduce((acc, def) => acc + (def._count?.events ?? 0), 0)
  const average = totalDefinitions > 0 ? totalEvents / totalDefinitions : 0

  return {
    totalDefinitions,
    totalEvents,
    avgEventsPerDefinition: average
  }
}

const EventsList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const { currentProduct, setCurrentProductBySlug, hasSelectedProduct } = useProduct()
  const navigate = useNavigate()

  const [definitions, setDefinitions] = useState<EventDefinition[]>([])
  const [filteredDefinitions, setFilteredDefinitions] = useState<EventDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [interactionFilter, setInteractionFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [createEventLoading, setCreateEventLoading] = useState(false)
  const fetchPromiseRef = useRef<Promise<void> | null>(null)
  const lastLoadedProductIdRef = useRef<string | null>(null)

  // Sync product based on slug
  useEffect(() => {
    if (!productName) return

    const productMatchesSlug = currentProduct && doesProductNameMatchSlug(currentProduct.name, productName)
    if (!productMatchesSlug) {
      setCurrentProductBySlug(productName)
    }
  }, [productName, currentProduct, setCurrentProductBySlug])

  const loadDefinitions = useCallback(async (force = false) => {
    if (!currentProduct) return

    const productId = currentProduct.id

    if (fetchPromiseRef.current) {
      if (!force && lastLoadedProductIdRef.current === productId) {
        return fetchPromiseRef.current
      }
      if (!force) {
        return fetchPromiseRef.current
      }
      await fetchPromiseRef.current
    }

    if (!force && lastLoadedProductIdRef.current === productId) {
      return
    }

    const fetchPromise = (async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await eventDefinitionsApi.getByProduct(productId)
        setDefinitions(response.data)
        lastLoadedProductIdRef.current = productId
      } catch (err) {
        console.error('Error loading event definitions:', err)
        setError('Impossible de charger les événements. Veuillez réessayer plus tard.')
        setDefinitions([])
        setFilteredDefinitions([])
      } finally {
        setLoading(false)
        fetchPromiseRef.current = null
      }
    })()

    fetchPromiseRef.current = fetchPromise
    return fetchPromise
  }, [currentProduct])

  useEffect(() => {
    if (!currentProduct) return

    if (lastLoadedProductIdRef.current !== currentProduct.id) {
      setDefinitions([])
      setFilteredDefinitions([])
    }

    loadDefinitions()
  }, [currentProduct, loadDefinitions])

  // Compute filter options and apply filters
  const interactionOptions = useMemo(() => {
    const set = new Set<string>()
    definitions.forEach(def => {
      if (def.userInteractionType) {
        set.add(def.userInteractionType)
      }
    })
    return Array.from(set).sort()
  }, [definitions])

  useEffect(() => {
    let filtered = definitions

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(def =>
        def.name.toLowerCase().includes(query) ||
        def.description?.toLowerCase().includes(query)
      )
    }

    if (interactionFilter !== 'all') {
      filtered = filtered.filter(def => def.userInteractionType === interactionFilter)
    }

    setFilteredDefinitions(filtered)
  }, [definitions, searchQuery, interactionFilter])

  const stats = useMemo(() => computeEventDefinitionStats(definitions), [definitions])

  const glossaryRows: EventDefinitionRow[] = useMemo(() => {
    return filteredDefinitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      userInteractionType: definition.userInteractionType || 'interaction',
      usageCount: definition._count?.events ?? 0,
      updatedAt: definition.updatedAt,
      createdAt: definition.createdAt,
    }))
  }, [filteredDefinitions])

  const columns: Column<EventDefinitionRow>[] = [
    {
      key: 'name',
      title: 'Événement',
      width: '220px',
      render: (_value, record) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">{record.name}</span>
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {record.usageCount}
          </Badge>
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (_value, record) => (
        <div className="max-w-md">
          <p className={cn('text-sm text-slate-600 line-clamp-2', !record.description && 'italic text-slate-400')}>
            {record.description || 'Description à définir'}
          </p>
        </div>
      ),
    },
    {
      key: 'userInteractionType',
      title: 'Interaction',
      width: '140px',
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {INTERACTION_LABELS[value] || value}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Dernière MAJ',
      width: '130px',
      render: (value: string) => {
        if (!value) return <span className="text-slate-400">-</span>
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return <span className="text-slate-400">-</span>
        }
        return <span className="text-slate-600 text-sm">{date.toLocaleDateString('fr-FR')}</span>
      }
    }
  ]

  const handleRowClick = (record: EventDefinitionRow) => {
    if (!productName) return
    const encodedName = encodeURIComponent(record.name)
    navigate(`/products/${productName}/events/${encodedName}`, {
      state: {
        eventDefinitionId: record.id
      }
    })
  }

  const resetFilters = () => {
    setSearchQuery('')
    setInteractionFilter('all')
  }

  const handleOpenCreateEvent = () => {
    setShowCreateEventModal(true)
  }

  const handleCreateEventSubmit = async ({ pageId, data }: { pageId: string; data: CreateEventRequest }) => {
    setCreateEventLoading(true)
    try {
      const response = await eventsApi.create(pageId, data)
      await loadDefinitions(true)
      return response.data
    } catch (err) {
      console.error('Error creating event from glossary:', err)
      throw err
    } finally {
      setCreateEventLoading(false)
    }
  }

  const handleCreateModalClose = () => {
    setShowCreateEventModal(false)
  }

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

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Glossaire des événements — {currentProduct.name}
          </CardTitle>
          <CardDescription>
            Vision centralisée des événements suivis, leur description canonique et les interactions couvertes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Événements référencés</div>
                <div className="text-2xl font-semibold text-slate-900 mt-2">{stats.totalDefinitions}</div>
                <p className="text-xs text-muted-foreground mt-1">Définitions actives dans le produit</p>
              </CardContent>
            </Card>
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Occurrences totales</div>
                <div className="text-2xl font-semibold text-slate-900 mt-2">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground mt-1">Nombre d&apos;implémentations sur les pages</p>
              </CardContent>
            </Card>
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Types d&apos;interaction</div>
                <div className="text-2xl font-semibold text-slate-900 mt-2">{interactionOptions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Couverture des interactions utilisateur</p>
              </CardContent>
            </Card>
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Moyenne par événement</div>
                <div className="text-2xl font-semibold text-slate-900 mt-2">
                  {stats.avgEventsPerDefinition.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Occurrences moyennes par définition</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <Input
                placeholder="Rechercher par nom ou description…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="md:max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Select value={interactionFilter} onValueChange={setInteractionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Interaction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les interactions</SelectItem>
                    {interactionOptions.map((interaction) => (
                      <SelectItem key={interaction} value={interaction}>
                        {INTERACTION_LABELS[interaction] || interaction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchQuery || interactionFilter !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={handleOpenCreateEvent} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un event
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {glossaryRows.length === 0 && !loading ? (
            EMPTY_STATE
          ) : (
            <DataTable<EventDefinitionRow>
              data={glossaryRows}
              columns={columns}
              loading={loading}
              emptyMessage="Aucune définition d'événement disponible."
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={handleCreateModalClose}
        onSubmit={handleCreateEventSubmit}
        loading={createEventLoading}
        productId={currentProduct.id}
      />
    </div>
  )
}

export { EventsList }
export default EventsList
