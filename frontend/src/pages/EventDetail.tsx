import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DataTable, type Column } from '@/components/organisms/DataTable'
import { eventDefinitionsApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Event, EventDefinition } from '@/types'
import { cn } from '@/lib/utils'

interface EventUsageRow {
  id: string
  pageName: string
  pageSlug?: string
  status: string
  updatedAt: string
}

interface NavigationState {
  eventDefinitionId?: string
}

const STATUS_LABELS: Record<string, string> = {
  TO_IMPLEMENT: 'À implémenter',
  TO_TEST: 'À tester',
  VALIDATED: 'Validé',
  ERROR: 'Erreur',
  to_implement: 'À implémenter',
  to_test: 'À tester',
  validated: 'Validé',
  error: 'Erreur'
}

const INTERACTION_LABELS: Record<string, string> = {
  click: 'Clic',
  page_load: 'Chargement page',
  interaction: 'Interaction',
  form_submit: 'Formulaire',
  scroll: 'Scroll',
  other: 'Autre'
}

const EventDetail: React.FC = () => {
  const { productName, eventName } = useParams<{ productName: string; eventName: string }>()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { currentProduct, setCurrentProductBySlug, hasSelectedProduct } = useProduct()

  const navigationState = state as NavigationState | undefined
  const [definitionId, setDefinitionId] = useState<string | null>(navigationState?.eventDefinitionId ?? null)
  const [definition, setDefinition] = useState<EventDefinition | null>(null)
  const [usageRows, setUsageRows] = useState<EventUsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const decodedEventName = useMemo(() => {
    if (!eventName) return ''
    try {
      return decodeURIComponent(eventName)
    } catch {
      return eventName
    }
  }, [eventName])

  // Ensure product is aligned with slug
  useEffect(() => {
    if (!productName) return
    const matches = currentProduct && doesProductNameMatchSlug(currentProduct.name, productName)
    if (!matches) {
      setCurrentProductBySlug(productName)
    }
  }, [productName, currentProduct, setCurrentProductBySlug])

  const fetchDefinitionIdByName = useCallback(async (): Promise<string | null> => {
    if (!currentProduct) return null
    try {
      const response = await eventDefinitionsApi.getByProduct(currentProduct.id)
      const match = response.data.find(def => def.name.toLowerCase() === decodedEventName.toLowerCase())
      return match ? match.id : null
    } catch (err) {
      console.error('Unable to fetch event definitions for lookup:', err)
      return null
    }
  }, [currentProduct, decodedEventName])

  const loadDefinition = useCallback(async () => {
    if (!currentProduct) return
    setLoading(true)
    setError(null)

    try {
      let targetId = definitionId
      if (!targetId) {
        targetId = await fetchDefinitionIdByName()
        if (!targetId) {
          setError('Définition introuvable pour cet événement.')
          setLoading(false)
          return
        }
        setDefinitionId(targetId)
      }

      const response = await eventDefinitionsApi.getById(targetId)
      setDefinition(response.data)

      const rows: EventUsageRow[] = (response.data.events ?? []).map((event: Event) => ({
        id: event.id,
        pageName: event.page?.name ?? 'Page inconnue',
        pageSlug: event.page?.slug,
        status: event.status,
        updatedAt: event.updatedAt ?? event.createdAt,
      }))
      setUsageRows(rows)
    } catch (err) {
      console.error('Error fetching event definition detail:', err)
      setError('Impossible de charger les détails de cet événement.')
    } finally {
      setLoading(false)
    }
  }, [currentProduct, definitionId, fetchDefinitionIdByName])

  useEffect(() => {
    if (currentProduct) {
      loadDefinition()
    }
  }, [currentProduct, loadDefinition])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    usageRows.forEach((row) => {
      const status = row.status ?? 'unknown'
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return Array.from(counts.entries())
  }, [usageRows])

  const lastUpdatedAt = useMemo(() => {
    const timestamps = usageRows
      .map(row => new Date(row.updatedAt).getTime())
      .filter(time => !Number.isNaN(time))

    if (timestamps.length === 0) return null
    const maxTimestamp = Math.max(...timestamps)
    return new Date(maxTimestamp)
  }, [usageRows])

  const uniquePagesCount = useMemo(() => {
    const set = new Set(usageRows.map(row => row.pageSlug ?? row.pageName))
    return set.size
  }, [usageRows])

  const usageColumns: Column<EventUsageRow>[] = [
    {
      key: 'pageName',
      title: 'Page',
      render: (value: string) => <span className="font-medium text-slate-900">{value}</span>
    },
    {
      key: 'status',
      title: 'Statut',
      width: '160px',
      render: (value: string) => (
        <Badge status={value} className="capitalize">
          {STATUS_LABELS[value] || value}
        </Badge>
      )
    },
    {
      key: 'updatedAt',
      title: 'Dernière mise à jour',
      width: '160px',
      render: (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return <span className="text-slate-400">-</span>
        }
        return <span className="text-slate-600">{date.toLocaleDateString('fr-FR')}</span>
      }
    }
  ]

  const handleUsageRowClick = (row: EventUsageRow) => {
    if (!productName || !row.pageSlug) return
    navigate(`/products/${productName}/pages/${row.pageSlug}`)
  }

  if (!hasSelectedProduct || !currentProduct) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900">Produit non sélectionné</h2>
          <p className="text-slate-600 mt-2">Veuillez sélectionner un produit pour consulter cet événement.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <h2 className="text-xl font-semibold text-slate-900">Chargement de l&apos;événement…</h2>
        </div>
      </div>
    )
  }

  if (error || !definition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-3 text-center">
        <div className="text-6xl">🚧</div>
        <h2 className="text-xl font-semibold text-slate-900">Événement introuvable</h2>
        <p className="text-slate-600 max-w-md">{error ?? 'Impossible d\'afficher cette définition d\'événement.'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <Button variant="ghost" className="px-0 text-sm text-slate-600 hover:text-slate-900" onClick={() => navigate(-1)}>
        ← Retour au glossaire
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="uppercase">
              {INTERACTION_LABELS[definition.userInteractionType] || definition.userInteractionType}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            {definition.name}
          </CardTitle>
          <CardDescription className={cn('text-base leading-relaxed', !definition.description && 'italic text-slate-400')}>
            {definition.description || 'Description à définir pour cet événement.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <div className="text-xs uppercase text-muted-foreground">Occurrences</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {usageRows.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Implémentations recensées
              </p>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <div className="text-xs uppercase text-muted-foreground">Pages concernées</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {uniquePagesCount}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pages contenant cet événement
              </p>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <div className="text-xs uppercase text-muted-foreground">Dernière mise à jour</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {lastUpdatedAt ? lastUpdatedAt.toLocaleDateString('fr-FR') : '—'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Date de la dernière occurrence modifiée
              </p>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Statuts</div>
              <div className="flex flex-wrap gap-2">
                {statusBreakdown.length === 0 ? (
                  <span className="text-xs text-slate-400">Aucune implémentation</span>
                ) : (
                  statusBreakdown.map(([status, count]) => (
                    <Badge key={status} status={status} className="text-xs font-normal capitalize">
                      {STATUS_LABELS[status] || status} — {count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Implémentations</h2>
            <p className="text-sm text-slate-600">
              Liste des pages utilisant cet événement. Cliquez sur une ligne pour accéder au détail de la page.
            </p>
          </div>

          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <DataTable<EventUsageRow>
                data={usageRows}
                columns={usageColumns}
                loading={loading}
                emptyMessage="Aucune implémentation recensée pour cet événement."
                onRowClick={handleUsageRowClick}
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export { EventDetail }
export default EventDetail
