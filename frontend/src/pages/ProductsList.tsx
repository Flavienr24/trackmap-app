import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateProductModal } from '@/components/organisms/CreateProductModal'
import { productsApi } from '@/services/api'
import { slugifyProductName } from '@/utils/slug'
import type { Product, CreateProductRequest } from '@/types'

/**
 * Products List Page
 * Main entry point for the TrackMap application
 * Displays all products with search, create, and management capabilities
 */
const ProductsList: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await productsApi.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
      // Set empty array on error to ensure component still renders
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load products on component mount
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleCreateProduct = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateProductRequest) => {
    setCreateLoading(true)
    try {
      const response = await productsApi.create(data)
      console.log('Product created:', response.data)
      await loadProducts() // Reload the list
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }


  const handleViewProduct = (product: Product) => {
    console.log('handleViewProduct called for:', product.name)
    const productSlug = slugifyProductName(product.name)
    navigate(`/products/${productSlug}`)
  }

  const handleOpenExternalUrl = (product: Product) => {
    if (product.url) {
      // Normalize URL - add https:// if no protocol
      let url = product.url
      if (!url.match(/^https?:\/\//)) {
        url = `https://${url}`
      }
      
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Filter products based on search query
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  // Table columns configuration
  const columns: Column<Product>[] = [
    {
      key: 'name',
      title: 'Nom du produit',
      render: (value, record) => (
        <div className='w-[300]'>
          <div className="font-medium text-neutral-900 text-wrap">{value}</div>
          {record.description && (
            <div className="text-sm text-neutral-500 text-wrap">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'pages_count',
      title: 'Pages',
      width: '100px',
      render: (value) => (
        <span className="text-neutral-600">{value || 0}</span>
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
      key: 'health_score',
      title: 'Score santé',
      width: '120px',
      render: (value) => {
        if (!value) return '-'
        const colorClass = value >= 80 ? 'text-success' : value >= 60 ? 'text-warning' : 'text-destructive'
        return <span className={`font-medium ${colorClass}`}>{value}%</span>
      },
    },
    {
      key: 'updated_at',
      title: 'Dernière modification',
      width: '160px',
    },
  ]

  // Table actions
  const actions: Action<Product>[] = [
    {
      label: '',
      icon: (
        <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
      onClick: handleOpenExternalUrl,
      iconOnly: true,
      show: (product: Product) => !!product.url,
      title: 'Open URL'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Produits TrackMap
          </h1>
          <p className="text-neutral-600 mt-1">
            Gérez vos plans de tracking GA4 par produit
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateProduct}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer un produit
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={loadProducts}
          title="Actualiser la liste"
          className="w-10 h-10 p-0 flex items-center justify-center ml-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* Products Table */}
      <DataTable
        data={filteredProducts}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Aucun produit trouvé. Créez votre premier produit pour commencer."
        onRowClick={handleViewProduct}
      />

      {/* Stats Footer */}
      {!loading && products.length > 0 && (
        <div className="text-sm text-neutral-500">
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

export { ProductsList }