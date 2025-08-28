import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreatePageModal } from '@/components/organisms/CreatePageModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { productsApi, pagesApi, variablesApi } from '@/services/api'
import type { Product, Page, Variable, CreatePageRequest, UpdatePageRequest } from '@/types'

/**
 * Product Detail Page
 * Shows product overview with pages, stats, and management options
 */
const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePageModal, setShowCreatePageModal] = useState(false)
  const [createPageLoading, setCreatePageLoading] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [editPageLoading, setEditPageLoading] = useState(false)

  const loadProduct = useCallback(async (productId: string) => {
    try {
      const response = await productsApi.getById(productId)
      setProduct(response.data)
    } catch (error) {
      console.error('Error loading product:', error)
      navigate('/products', { replace: true })
    }
  }, [navigate])

  const loadPages = useCallback(async (productId: string) => {
    try {
      const response = await pagesApi.getByProduct(productId)
      setPages(response.data)
    } catch (error) {
      console.error('Error loading pages:', error)
    }
  }, [])

  const loadVariables = useCallback(async (productId: string) => {
    try {
      const response = await variablesApi.getByProduct(productId)
      setVariables(response.data)
    } catch (error) {
      console.error('Error loading variables:', error)
    }
  }, [])
  
  const loadData = useCallback(async (productId: string) => {
    setLoading(true)
    try {
      await Promise.all([
        loadProduct(productId),
        loadPages(productId),
        loadVariables(productId)
      ])
    } finally {
      setLoading(false)
    }
  }, [loadProduct, loadPages, loadVariables])

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id, loadData])

  const handleCreatePage = () => {
    setShowCreatePageModal(true)
  }

  const handleCreatePageSubmit = async (data: CreatePageRequest) => {
    if (!id) return
    
    setCreatePageLoading(true)
    try {
      const response = await pagesApi.create(id, data)
      console.log('Page created:', response.data)
      await loadPages(id) // Reload the list
    } catch (error) {
      console.error('Error creating page:', error)
      throw error
    } finally {
      setCreatePageLoading(false)
    }
  }

  const handleEditPage = (page: Page) => {
    setEditPage(page)
  }

  const handleEditPageSubmit = async (pageId: string, data: UpdatePageRequest) => {
    setEditPageLoading(true)
    try {
      const response = await pagesApi.update(pageId, data)
      console.log('Page updated:', response.data)
      await loadPages(id!) // Reload the list
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    } finally {
      setEditPageLoading(false)
    }
  }

  const handleDeletePage = async (page: Page) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la page "${page.name}" ?`)) {
      try {
        await pagesApi.delete(page.id)
        console.log('Page deleted:', page)
        await loadPages(id!) // Reload the list
      } catch (error) {
        console.error('Error deleting page:', error)
      }
    }
  }

  const handleViewPage = (page: Page) => {
    navigate(`/pages/${page.id}`)
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-neutral-900">Produit introuvable</h2>
          <p className="text-neutral-600 mt-2">Ce produit n'existe pas ou a été supprimé.</p>
          <Link to="/products" className="inline-block mt-4">
            <Button variant="primary">← Retour aux produits</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Pages table columns
  const columns: Column<Page>[] = [
    {
      key: 'name',
      title: 'Nom de la page',
      render: (value, record) => (
        <div>
          <div className="font-medium text-neutral-900">{value}</div>
          <div className="text-sm text-neutral-500 font-mono">{record.url}</div>
        </div>
      ),
    },
    {
      key: 'events_count',
      title: 'Events',
      width: '100px',
      render: (value) => (
        <span className="text-neutral-600">{value || 0}</span>
      ),
    },
    {
      key: 'updated_at',
      title: 'Dernière modification',
      width: '160px',
    },
  ]

  // Pages table actions
  const actions: Action<Page>[] = [
    {
      label: 'Events',
      onClick: handleViewPage,
      variant: 'primary',
    },
    {
      label: 'Modifier',
      onClick: handleEditPage,
      variant: 'secondary',
    },
    {
      label: 'Supprimer',
      onClick: handleDeletePage,
      variant: 'danger',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to="/products">Retour</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <span className="text-neutral-900 font-medium">{product.name}</span>
        </nav>
      </div>

      {/* Product Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{product.name}</h1>
            {product.description && (
              <p className="text-neutral-600 mt-2">{product.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={() => console.log('Edit product')}>
              Modifier le produit
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/products/${id}/variables`)}>
              Gérer les variables
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/products/${id}/suggested-values`)}>
              Valeurs suggérées
            </Button>
            <Button onClick={handleCreatePage}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une page
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {product.pages_count || pages.length}
            </div>
            <div className="text-sm text-neutral-600">Pages</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {variables.length}
            </div>
            <div className="text-sm text-neutral-600">Variables</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {product.events_count || 0}
            </div>
            <div className="text-sm text-neutral-600">Events totaux</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {product.health_score || 0}%
            </div>
            <div className="text-sm text-neutral-600">Score santé</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-sm text-neutral-600">Dernière modif.</div>
            <div className="font-medium text-neutral-900">
              {new Date(product.updated_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {/* Pages Section */}
      <div className="bg-white rounded-lg border border-neutral-200">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Pages du produit</h2>
              <p className="text-neutral-600 text-sm mt-1">
                Gérez les pages et leurs événements de tracking
              </p>
            </div>
            <Button onClick={handleCreatePage} size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle page
            </Button>
          </div>
        </div>

        <div className="p-6">
          <DataTable
            data={pages}
            columns={columns}
            actions={actions}
            loading={loading}
            emptyMessage="Aucune page trouvée. Créez votre première page pour commencer le tracking."
            onRowClick={handleViewPage}
          />
        </div>
      </div>


      {/* Product Info */}
      <div className="flex justify-end pt-4">
        <div className="text-sm text-neutral-500">
          Produit créé le {new Date(product.created_at).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Create Page Modal */}
      <CreatePageModal
        isOpen={showCreatePageModal}
        onClose={() => setShowCreatePageModal(false)}
        onSubmit={handleCreatePageSubmit}
        loading={createPageLoading}
      />

      {/* Edit Page Modal */}
      <EditPageModal
        isOpen={!!editPage}
        page={editPage}
        onClose={() => setEditPage(null)}
        onSubmit={handleEditPageSubmit}
        loading={editPageLoading}
      />
    </div>
  )
}

export { ProductDetail }