import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/atoms/Tooltip'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreatePageModal } from '@/components/organisms/CreatePageModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { pagesApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Page, CreatePageRequest, UpdatePageRequest } from '@/types'

/**
 * Pages List Page
 * Shows all pages for the selected product with management capabilities
 */
const PagesList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const navigate = useNavigate()
  const { currentProduct, setCurrentProductBySlug, hasSelectedProduct } = useProduct()
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Load pages data with conflict information
  const loadPages = useCallback(async (productId: string) => {
    setLoading(true)
    try {
      const response = await pagesApi.getByProduct(productId, { include_conflicts: 'true' })
      setPages(response.data)
    } catch (error) {
      console.error('Error loading pages:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
      loadPages(currentProduct.id)
    }
  }, [currentProduct?.id, loadPages])

  // Filter pages based on search
  const filteredPages = pages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Modal handlers
  const handleCreatePage = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreatePageRequest) => {
    if (!currentProduct) return

    setCreateLoading(true)
    try {
      const response = await pagesApi.create(currentProduct.id, data)
      const newPage = response.data

      // Navigate to the newly created page
      if (newPage && productName) {
        navigate(`/products/${productName}/pages/${newPage.slug}`)
      }
    } catch (error) {
      console.error('Error creating page:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditPage = (page: Page) => {
    setEditPage(page)
  }

  const handleEditSubmit = async (pageId: string, data: UpdatePageRequest) => {
    if (!currentProduct) return

    setEditLoading(true)
    try {
      await pagesApi.update(pageId, data)
      await loadPages(currentProduct.id)
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeletePage = async (page: Page) => {
    if (!currentProduct) return

    try {
      await pagesApi.delete(page.id)
      await loadPages(currentProduct.id)
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const handleViewPage = (page: Page) => {
    if (productName) {
      navigate(`/products/${productName}/pages/${page.slug}`)
    }
  }

  if (!hasSelectedProduct || !currentProduct) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900">Produit non sélectionné</h2>
          <p className="text-slate-600 mt-2">Veuillez sélectionner un produit pour voir ses pages.</p>
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
          <p className="text-slate-600 mt-2">Récupération des pages</p>
        </div>
      </div>
    )
  }

  // Table columns
  const columns: Column<Page>[] = [
    {
      key: 'name',
      title: 'Nom de la page',
      render: (value) => (
        <div className="font-medium text-slate-900">{value}</div>
      ),
    },
    {
      key: 'events_count',
      title: 'Events',
      width: '150px',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-600">{record.events_count ?? record.events?.length ?? 0}</span>
          {record.conflicts_count !== undefined && record.conflicts_count > 0 && (
            <Tooltip content={`${record.conflicts_count} conflit${record.conflicts_count > 1 ? 's' : ''} détecté${record.conflicts_count > 1 ? 's' : ''}`}>
              <Badge
                variant="error"
                className="cursor-pointer hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation()
                  if (productName) {
                    navigate(`/products/${productName}/pages/${record.slug}`)
                  }
                }}
              >
                ⚠️
              </Badge>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'url',
      title: 'URL',
      render: (value) => value ? (
        <a 
          href={value.startsWith('http') ? value : `https://${value}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs block"
        >
          {value}
        </a>
      ) : (
        <span className="text-slate-400">Non définie</span>
      ),
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

  const actions: Action<Page>[] = [
    {
      label: 'Modifier',
      onClick: handleEditPage,
      iconOnly: true,
      icon: (
        <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">
                Pages - {currentProduct.name}
              </CardTitle>
              <CardDescription className="text-lg">
                Gérez les pages et leurs événements de tracking
              </CardDescription>
            </div>
            <Button onClick={handleCreatePage}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle page
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {pages.length}
                </div>
                <div className="text-sm text-slate-600">Total pages</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                {pages.reduce((total, page) => total + (page.events_count ?? page.events?.length ?? 0), 0)}
                </div>
                <div className="text-sm text-slate-600">Total événements</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {pages.filter(page => page.url).length}
                </div>
                <div className="text-sm text-slate-600">Pages avec URL</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                type="search"
                placeholder="Rechercher une page..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => currentProduct && loadPages(currentProduct.id)}
              title="Actualiser la liste"
              className="ml-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredPages}
            columns={columns}
            actions={actions}
            loading={loading}
            emptyMessage="Aucune page trouvée. Créez votre première page pour commencer le tracking."
            onRowClick={handleViewPage}
          />
        </CardContent>
      </Card>

      {/* Stats Footer */}
      {filteredPages.length > 0 && (
        <div className="text-sm text-slate-500 text-center">
          {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredPages.length !== 1 ? 's' : ''} sur ${pages.length})`}
        </div>
      )}

      {/* Modals */}
      <CreatePageModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />

      <EditPageModal
        isOpen={!!editPage}
        page={editPage}
        onClose={() => setEditPage(null)}
        onSubmit={handleEditSubmit}
        onDelete={handleDeletePage}
        loading={editLoading}
      />
    </div>
  )
}

export { PagesList }
export default PagesList
