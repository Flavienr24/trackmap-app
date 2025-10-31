import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreatePageModal } from '@/components/organisms/CreatePageModal'
import { EditPageModal } from '@/components/organisms/EditPageModal'
import { EditProductModal } from '@/components/organisms/EditProductModal'
import { CommonPropertiesModal } from '@/components/organisms/CommonPropertiesModal'
import { pagesApi, productsApi, commonPropertiesApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type {
  Page,
  CreatePageRequest,
  UpdatePageRequest,
  UpdateProductRequest,
  Product,
  CommonProperty,
} from '@/types'

/**
 * Dashboard Page - Main product overview with stats, pages, and actions
 * Replaces the old ProductDetail page as the default product view
 */
const Dashboard: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const navigate = useNavigate()
  const { 
    currentProduct, 
    setCurrentProductBySlug, 
    hasSelectedProduct,
    loadProducts,
    setCurrentProduct
  } = useProduct()
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePageModal, setShowCreatePageModal] = useState(false)
  const [createPageLoading, setCreatePageLoading] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [editPageLoading, setEditPageLoading] = useState(false)
  const [showEditProductModal, setShowEditProductModal] = useState(false)
  const [editProductLoading, setEditProductLoading] = useState(false)
  const [showCommonPropertiesModal, setShowCommonPropertiesModal] = useState(false)
  const [commonPropertiesCount, setCommonPropertiesCount] = useState(0)
  const [commonProperties, setCommonProperties] = useState<CommonProperty[]>([])

  // Load dashboard data (pages + common properties) for the current product
  const loadDashboardData = useCallback(async () => {
    if (!currentProduct) return
    try {
      const [pagesResponse, commonPropsResponse] = await Promise.all([
        pagesApi.getByProduct(currentProduct.id),
        commonPropertiesApi.getByProduct(currentProduct.id),
      ])

      setPages(pagesResponse.data)
      setCommonProperties(commonPropsResponse.data)
      setCommonPropertiesCount(commonPropsResponse.data.length)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }, [currentProduct])

  // Initialize product on mount
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

  // Load pages when product is available
  useEffect(() => {
    if (currentProduct) {
      setLoading(true)
      loadDashboardData().finally(() => setLoading(false))
    }
  }, [currentProduct, loadDashboardData])

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
              console.warn('Error parsing event properties:', error)
            }
          }
        })
      }
    })
    
    return usedProperties.size
  }, [pages])

  // Page modal handlers
  const handleCreatePage = () => {
    setShowCreatePageModal(true)
  }

  const handleCreatePageSubmit = async (data: CreatePageRequest) => {
    if (!currentProduct) return

    setCreatePageLoading(true)
    try {
      const response = await pagesApi.create(currentProduct.id, data)
      const newPage = response.data

      if (newPage && productName) {
        navigate(`/products/${productName}/pages/${newPage.slug}`)
      }
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
      await pagesApi.update(pageId, data)
      await loadDashboardData()
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    } finally {
      setEditPageLoading(false)
    }
  }

  const handleDeletePage = async (page: Page) => {
    try {
      await pagesApi.delete(page.id)
      await loadDashboardData()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const handleViewPage = (page: Page) => {
    if (currentProduct && productName) {
      navigate(`/products/${productName}/pages/${page.slug}`)
    }
  }

  // Product modal handlers
  const handleEditProduct = () => {
    setShowEditProductModal(true)
  }

  const handleEditProductSubmit = async (productId: string, data: UpdateProductRequest) => {
    setEditProductLoading(true)
    try {
      // Update product via API
      const response = await productsApi.update(productId, data)

      // Update current product in context if it's the one being edited
      if (currentProduct?.id === productId) {
        setCurrentProduct(response.data)
      }

      // Refresh products list to ensure consistency
      await Promise.all([
        loadProducts(true), // Force reload
        loadDashboardData(),
      ])
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    } finally {
      setEditProductLoading(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`)) {
      return
    }

    setEditProductLoading(true)
    try {
      await productsApi.delete(product.id)
      await loadProducts(true) // Force reload after delete

      if (currentProduct?.id === product.id) {
        setCurrentProduct(null)
      }

      setShowEditProductModal(false)
      navigate('/products')
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setEditProductLoading(false)
    }
  }

  // Loading state
  if (loading || !hasSelectedProduct || !currentProduct) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-slate-900">Chargement...</h2>
          <p className="text-slate-600 mt-2">Récupération des données du produit</p>
        </div>
      </div>
    )
  }

  // Pages table configuration
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
      width: '100px',
      render: (_, record) => (
        <span className="text-slate-600">{record.events_count ?? record.events?.length ?? 0}</span>
      ),
    },
    {
      key: 'updated_at',
      title: 'Dernière modification',
      width: '160px',
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
      {/* Product Overview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">{currentProduct.name}</CardTitle>
              {currentProduct.description && (
                <CardDescription className="text-lg mt-2">
                  {currentProduct.description}
                </CardDescription>
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
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {currentProduct.pages_count || pages.length}
                </div>
                <div className="text-sm text-slate-600">Pages</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {currentProduct.events_count || 0}
                </div>
                <div className="text-sm text-slate-600">Events totaux</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {getUsedPropertiesCount()}
                </div>
                <div className="text-sm text-slate-600">Propriétés utilisées</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {commonPropertiesCount}
                </div>
                <div className="text-sm text-slate-600">Propriétés communes</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {currentProduct.health_score || 0}%
                </div>
                <div className="text-sm text-slate-600">Score santé</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout - Actions & Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Actions Section (Left) */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Actions rapides pour ce produit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={handleCreatePage}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une page
            </Button>
            
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate(`/products/${productName}/events`)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Voir tous les événements
            </Button>
            
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate(`/products/${productName}/properties`)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Gérer les propriétés
            </Button>
          </CardContent>
        </Card>

        {/* Pages Section (Right) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pages du produit</CardTitle>
                  <CardDescription>
                    Gérez les pages et leurs événements de tracking
                  </CardDescription>
                </div>
                <Button onClick={handleCreatePage} size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nouvelle page
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <DataTable
                data={pages}
                columns={columns}
                actions={actions}
                loading={false}
                emptyMessage="Aucune page trouvée. Créez votre première page pour commencer le tracking."
                onRowClick={handleViewPage}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Common Properties Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Propriétés communes</CardTitle>
              <CardDescription>
                Propriétés auto-remplies lors de la création d’un événement
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={() => setShowCommonPropertiesModal(true)}>
              Gérer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {commonProperties.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-slate-700 font-medium mb-2">Aucune propriété commune configurée</p>
              <p className="text-slate-500 mb-4">
                Ajoutez des propriétés communes pour pré-remplir vos nouveaux events.
              </p>
              <Button onClick={() => setShowCommonPropertiesModal(true)}>Ajouter une propriété</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 uppercase text-xs">
                    <th className="py-2 pr-4 font-medium">Propriété</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 font-medium">Valeur par défaut</th>
                  </tr>
                </thead>
                <tbody>
                  {commonProperties.map((commonProp) => (
                    <tr key={commonProp.id} className="border-t border-slate-200">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {commonProp.property?.name || 'Propriété inconnue'}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {commonProp.property?.description || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-sm font-medium ${
                            commonProp.suggestedValue?.isContextual
                              ? 'border-purple-200 bg-purple-50 text-purple-800'
                              : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {commonProp.suggestedValue?.value || 'Valeur inconnue'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last update info */}
      <div className="flex justify-end pt-4">
        <div className="text-sm text-slate-500">
          Produit créé le {new Date(currentProduct.created_at).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Modals */}
      <CreatePageModal
        isOpen={showCreatePageModal}
        onClose={() => setShowCreatePageModal(false)}
        onSubmit={handleCreatePageSubmit}
        loading={createPageLoading}
      />

      <EditPageModal
        isOpen={!!editPage}
        page={editPage}
        onClose={() => setEditPage(null)}
        onSubmit={handleEditPageSubmit}
        onDelete={handleDeletePage}
        loading={editPageLoading}
      />

      <EditProductModal
        isOpen={showEditProductModal}
        product={currentProduct}
        onClose={() => setShowEditProductModal(false)}
        onSubmit={handleEditProductSubmit}
        onDelete={handleDeleteProduct}
        loading={editProductLoading}
      />

      <CommonPropertiesModal
        isOpen={showCommonPropertiesModal}
        productId={currentProduct.id}
        onClose={() => {
          setShowCommonPropertiesModal(false)
          void loadDashboardData()
        }}
      />
    </div>
  )
}

export { Dashboard }
export default Dashboard
