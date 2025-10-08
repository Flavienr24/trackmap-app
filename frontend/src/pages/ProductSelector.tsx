import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CreateProductModal } from '@/components/organisms/CreateProductModal'
import { useProduct } from '@/hooks/useProduct'
import { slugifyProductName } from '@/utils/slug'
import type { CreateProductRequest } from '@/types'

/**
 * Product Selector Page
 * Landing page when no product is selected
 * Shows available products and allows creation of new ones
 * Automatically redirects to the last consulted product if available
 */
const ProductSelector: React.FC = () => {
  const navigate = useNavigate()
  const {
    products,
    currentProduct,
    setCurrentProduct,
    loadProducts,
    isLoading
  } = useProduct()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Redirect to last consulted product if available
  useEffect(() => {
    if (currentProduct && !isLoading) {
      const slug = slugifyProductName(currentProduct.name)
      navigate(`/products/${slug}`, { replace: true })
    }
  }, [currentProduct, isLoading, navigate])

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  // Handle product selection
  const handleSelectProduct = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setCurrentProduct(product)
      const slug = slugifyProductName(product.name)
      navigate(`/products/${slug}`)
    }
  }

  // Handle creating new product
  const handleCreateProduct = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateProductRequest) => {
    setCreateLoading(true)
    try {
      await loadProducts() // Refresh products list
      // The new product should now be in the list, select it
      const newProduct = products.find(p => p.name === data.name)
      if (newProduct) {
        handleSelectProduct(newProduct.id)
      }
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-slate-900">Chargement...</h2>
          <p className="text-slate-600 mt-2">Récupération de la liste des produits</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Sélectionnez un produit
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Choisissez un produit pour commencer à gérer votre plan de tracking GA4
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Button onClick={handleCreateProduct} size="lg">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer un nouveau produit
        </Button>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? 'Essayez de modifier votre recherche ou créez un nouveau produit.'
                : 'Commencez par créer votre premier produit pour gérer vos plans de tracking.'
              }
            </p>
            <Button onClick={handleCreateProduct}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer un produit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleSelectProduct(product.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-2">
                      {product.name}
                    </CardTitle>
                    {product.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {product.description}
                      </CardDescription>
                    )}
                  </div>
                  {product.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        const url = product.url!.startsWith('http') 
                          ? product.url 
                          : `https://${product.url}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }}
                      title="Ouvrir le site web"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {product.pages_count || 0}
                    </div>
                    <div className="text-xs text-slate-600">Pages</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {product.events_count || 0}
                    </div>
                    <div className="text-xs text-slate-600">Events</div>
                  </div>
                  
                  <div>
                    <div className={`text-lg font-semibold ${
                      (product.health_score || 0) >= 80 
                        ? 'text-green-600' 
                        : (product.health_score || 0) >= 60 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                    }`}>
                      {product.health_score || 0}%
                    </div>
                    <div className="text-xs text-slate-600">Santé</div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-slate-500 text-center">
                  Modifié le {new Date(product.updated_at).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {filteredProducts.length > 0 && (
        <div className="text-center text-sm text-slate-500 pt-4">
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredProducts.length !== 1 ? 's' : ''} sur ${products.length})`}
        </div>
      )}

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />
    </div>
  )
}

export { ProductSelector }
export default ProductSelector