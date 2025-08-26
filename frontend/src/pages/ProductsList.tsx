import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateProductModal } from '@/components/organisms/CreateProductModal'
import { EditProductModal } from '@/components/organisms/EditProductModal'
import { mockData } from '@/services/api'
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types'

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
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Load products on component mount
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await productsApi.getAll()
      // setProducts(response.data)
      
      // Mock data simulation
      setTimeout(() => {
        setProducts(mockData.products)
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error loading products:', error)
      setLoading(false)
    }
  }

  const handleCreateProduct = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateProductRequest) => {
    setCreateLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await productsApi.create(data)
      
      // Mock data simulation
      const newProduct: Product = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        name: data.name,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pages_count: 0,
        events_count: 0,
        health_score: 0
      }
      
      // Add to global mockData and reload
      mockData.products.unshift(newProduct)
      setProducts([...mockData.products])
      console.log('Product created:', newProduct)
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditProduct(product)
  }

  const handleEditSubmit = async (id: string, data: UpdateProductRequest) => {
    setEditLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await productsApi.update(id, data)
      
      // Update in global mockData and reload
      const updatedProduct = { ...data, updated_at: new Date().toISOString() }
      const index = mockData.products.findIndex(p => p.id === id)
      if (index !== -1) {
        mockData.products[index] = { ...mockData.products[index], ...updatedProduct }
      }
      setProducts([...mockData.products])
      console.log('Product updated:', { id, ...data })
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    console.log('handleDeleteProduct called for:', product.name)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
      try {
        // TODO: Replace with real API call
        // await productsApi.delete(product.id)
        
        // Remove from global mockData and reload
        const index = mockData.products.findIndex(p => p.id === product.id)
        if (index !== -1) {
          mockData.products.splice(index, 1)
        }
        setProducts([...mockData.products])
        console.log('Product deleted:', product)
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  const handleViewProduct = (product: Product) => {
    console.log('handleViewProduct called for:', product.name)
    navigate(`/products/${product.id}`)
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
        <div>
          <div className="font-medium text-neutral-900">{value}</div>
          {record.description && (
            <div className="text-sm text-neutral-500">{record.description}</div>
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
        const colorClass = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'
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
      label: 'Voir',
      onClick: handleViewProduct,
      variant: 'primary',
    },
    {
      label: 'Modifier',
      onClick: handleEditProduct,
      variant: 'secondary',
    },
    {
      label: 'Supprimer',
      onClick: handleDeleteProduct,
      variant: 'danger',
    },
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
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="outline" onClick={loadProducts}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
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

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={!!editProduct}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />
    </div>
  )
}

export { ProductsList }