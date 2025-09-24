import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreatePageModal } from '@/components/organisms/CreatePageModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { EditProductModal } from '@/components/organisms/EditProductModal'
import { productsApi, pagesApi } from '@/services/api'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Product, Page, CreatePageRequest, UpdatePageRequest, UpdateProductRequest } from '@/types'

/**
 * Product Detail Page
 * Shows product overview with pages, stats, and management options
 */
const ProductDetail: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const navigate = useNavigate()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePageModal, setShowCreatePageModal] = useState(false)
  const [createPageLoading, setCreatePageLoading] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [editPageLoading, setEditPageLoading] = useState(false)
  const [showEditProductModal, setShowEditProductModal] = useState(false)
  const [editProductLoading, setEditProductLoading] = useState(false)

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

  const loadProduct = useCallback(async (productSlug: string) => {
    try {
      const product = await findProductBySlug(productSlug)
      if (!product) {
        console.error('Product not found for slug:', productSlug)
        navigate('/products', { replace: true })
        return
      }
      setProduct(product)
      // Extract pages with events from product data
      setPages(product.pages || [])
    } catch (error) {
      console.error('Error loading product:', error)
      navigate('/products', { replace: true })
    }
  }, [navigate, findProductBySlug])

  const loadPages = useCallback(async (productSlug: string) => {
    try {
      const product = await findProductBySlug(productSlug)
      if (!product) return
      const response = await pagesApi.getByProduct(product.id)
      setPages(response.data)
    } catch (error) {
      console.error('Error loading pages:', error)
    }
  }, [findProductBySlug])



  // Calculate unique properties used across all events
  const getUsedPropertiesCount = useCallback(() => {
    const usedProperties = new Set<string>()
    
    pages.forEach((page: any) => {
      if (page.events) {
        page.events.forEach((event: any) => {
          if (event.properties) {
            try {
              const parsed = typeof event.properties === 'string' 
                ? JSON.parse(event.properties) 
                : event.properties
              Object.keys(parsed || {}).forEach(key => usedProperties.add(key))
            } catch (error) {
              console.warn('Error parsing event properties:', error, event.properties)
            }
          }
        })
      }
    })
    
    return usedProperties.size
  }, [pages])
  
  const loadData = useCallback(async (productSlug: string) => {
    setLoading(true)
    try {
      await Promise.all([
        loadProduct(productSlug),
        loadPages(productSlug)
      ])
    } finally {
      setLoading(false)
    }
  }, [loadProduct, loadPages])

  useEffect(() => {
    if (productName) {
      loadData(productName)
    }
  }, [productName, loadData])

  // Reload data when component gains focus to ensure fresh event counts
  useEffect(() => {
    const handleFocusOrVisibility = () => {
      if (!document.hidden && productName) {
        // Reload product data to get fresh event counts and pages with events
        loadProduct(productName)
        loadPages(productName)
      }
    }

    // Listen to focus and visibility changes
    window.addEventListener('focus', handleFocusOrVisibility)
    document.addEventListener('visibilitychange', handleFocusOrVisibility)

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility)
      document.removeEventListener('visibilitychange', handleFocusOrVisibility)
    }
  }, [productName, loadProduct, loadPages])

  const handleCreatePage = () => {
    setShowCreatePageModal(true)
  }

  const handleCreatePageSubmit = async (data: CreatePageRequest) => {
    if (!productName || !product) return
    
    setCreatePageLoading(true)
    try {
      const response = await pagesApi.create(product.id, data)
      console.log('Page created:', response.data)
      await loadPages(productName) // Reload the list
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
    if (!productName) return
    setEditPageLoading(true)
    try {
      const response = await pagesApi.update(pageId, data)
      console.log('Page updated:', response.data)
      await loadPages(productName) // Reload the list
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    } finally {
      setEditPageLoading(false)
    }
  }

  const handleDeletePage = async (page: Page) => {
    if (!productName) return
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la page "${page.name}" ?`)) {
      try {
        await pagesApi.delete(page.id)
        console.log('Page deleted:', page)
        await loadPages(productName) // Reload the list
      } catch (error) {
        console.error('Error deleting page:', error)
      }
    }
  }

  const handleViewPage = (page: Page) => {
    if (!productName) return
    navigate(`/products/${productName}/pages/${page.slug}`)
  }

  const handleEditProduct = () => {
    setShowEditProductModal(true)
  }

  const handleEditProductSubmit = async (productId: string, data: UpdateProductRequest) => {
    setEditProductLoading(true)
    try {
      const response = await productsApi.update(productId, data)
      console.log('Product updated:', response.data)
      if (productName) {
        await loadProduct(productName) // Reload the product data
      }
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    } finally {
      setEditProductLoading(false)
    }
  }

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-neutral-900">Chargement...</h2>
          <p className="text-neutral-600 mt-2">Récupération des données du produit</p>
        </div>
      </div>
    )
  }

  // Show not found only after loading is complete and no product
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
      render: (value) => (
        <div className="font-medium text-neutral-900">{value}</div>
      ),
    },
    {
      key: 'events_count',
      title: 'Events',
      width: '100px',
      render: (_, record) => (
        <span className="text-neutral-600">{record.events?.length || 0}</span>
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
      label: 'Modifier',
      onClick: handleEditPage,
      iconOnly: true,
      icon: (
        <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    }
  ]

  return (
    <div className="w-full space-y-6">
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
          <div className='w-100'>
            <h1 className="text-3xl font-bold text-neutral-900">{product.name}</h1>
            {product.description && (
              <p className="text-neutral-600 mt-2">{product.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={handleEditProduct}>
              Modifier le produit
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/products/${productName}/properties`)}>
              Gérer les propriétés
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/products/${productName}/suggested-values`)}>
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
              {product.events_count || 0}
            </div>
            <div className="text-sm text-neutral-600">Events totaux</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {getUsedPropertiesCount()}
            </div>
            <div className="text-sm text-neutral-600">Propriétés utilisées</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-success">
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
            loading={false}
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
        onDelete={handleDeletePage}
        loading={editPageLoading}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={showEditProductModal}
        product={product}
        onClose={() => setShowEditProductModal(false)}
        onSubmit={handleEditProductSubmit}
        loading={editProductLoading}
      />
    </div>
  )
}

export { ProductDetail }