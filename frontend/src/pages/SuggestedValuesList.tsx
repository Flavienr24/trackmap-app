import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateSuggestedValueModal } from '@/components/organisms/CreateSuggestedValueModal'
import { EditSuggestedValueModal } from '@/components/organisms/EditSuggestedValueModal'
import { suggestedValuesApi, productsApi } from '@/services/api'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { SuggestedValue, Product, CreateSuggestedValueRequest, UpdateSuggestedValueRequest } from '@/types'

/**
 * Suggested Values List Page
 * Manages suggested values for a specific product
 * Suggested values can be static ("homepage") or contextual ("$page-name")
 */
const SuggestedValuesList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const [suggestedValues, setSuggestedValues] = useState<SuggestedValue[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editSuggestedValue, setEditSuggestedValue] = useState<SuggestedValue | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Redirect if no productName
  if (!productName) {
    return <Navigate to="/products" replace />
  }

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

  const loadProduct = useCallback(async () => {
    try {
      const product = await findProductBySlug(productName!)
      if (!product) {
        console.error('Product not found for slug:', productName)
        return null
      }
      setProduct(product)
      return product
    } catch (error) {
      console.error('Error loading product:', error)
      return null
    }
  }, [productName, findProductBySlug])

  const loadSuggestedValues = useCallback(async (productId: string) => {
    try {
      const response = await suggestedValuesApi.getByProduct(productId)
      setSuggestedValues(response.data)
    } catch (error) {
      console.error('Error loading suggested values:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const productData = await loadProduct()
      if (productData) {
        await loadSuggestedValues(productData.id)
      }
    } finally {
      setLoading(false)
    }
  }, [loadProduct, loadSuggestedValues])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateSuggestedValue = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateSuggestedValueRequest) => {
    if (!product) return
    setCreateLoading(true)
    try {
      const response = await suggestedValuesApi.create(product.id, data)
      console.log('Suggested value created:', response.data)
      await loadSuggestedValues(product.id) // Reload the list
    } catch (error) {
      console.error('Error creating suggested value:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditSuggestedValue = (suggestedValue: SuggestedValue) => {
    setEditSuggestedValue(suggestedValue)
  }

  const handleEditSubmit = async (id: string, data: UpdateSuggestedValueRequest) => {
    if (!product) return
    setEditLoading(true)
    try {
      const response = await suggestedValuesApi.update(id, data)
      console.log('Suggested value updated:', response.data)
      await loadSuggestedValues(product.id) // Reload the list
    } catch (error) {
      console.error('Error updating suggested value:', error)
      throw error
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteSuggestedValue = async (suggestedValue: SuggestedValue) => {
    console.log('handleDeleteSuggestedValue called for:', suggestedValue.value)
    try {
      await suggestedValuesApi.delete(suggestedValue.id)
      console.log('Suggested value deleted:', suggestedValue)
      if (product) await loadSuggestedValues(product.id) // Reload the list
    } catch (error) {
      console.error('Error deleting suggested value:', error)
    }
  }

  // Filter suggested values based on search query
  const filteredSuggestedValues = suggestedValues.filter(suggestedValue => 
    suggestedValue.value.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Table columns configuration
  const columns: Column<SuggestedValue>[] = [
    {
      key: 'value',
      title: 'Valeur',
      render: (value, record) => (
        <div className="flex items-center space-x-3">
          <div className="font-medium text-neutral-900">
            {record.is_contextual ? (
              <span className="font-mono text-purple-700">{value}</span>
            ) : (
              <span>{value}</span>
            )}
          </div>
          {record.is_contextual && (
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              Contextuelle
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'is_contextual',
      title: 'Type',
      width: '120px',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {value ? 'Contextuelle' : 'Statique'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Créée le',
      width: '160px',
    },
    {
      key: 'updated_at',
      title: 'Modifiée le',
      width: '160px',
    },
  ]

  // Table actions
  const actions: Action<SuggestedValue>[] = [
    {
      label: 'Modifier',
      onClick: handleEditSuggestedValue,
      variant: 'secondary',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to={`/products/${productName}`}>Retour au produit</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <Link to={`/products/${productName}`} className="hover:text-neutral-900">{product?.name || 'Chargement...'}</Link>
          <span>›</span>
          <Link to={`/products/${productName}/properties`} className="hover:text-neutral-900">Propriétés</Link>
          <span>›</span>
          <span className="text-neutral-900 font-medium">Valeurs suggérées</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Valeurs suggérées
          </h1>
          <p className="text-neutral-600 mt-1">
            Valeurs réutilisables pour "{product?.name || 'Chargement...'}" • {suggestedValues.length} valeur{suggestedValues.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateSuggestedValue}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une valeur
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-600 mr-3 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Types de valeurs</h3>
            <div className="text-sm text-blue-800 mt-1">
              <p><strong>Statiques :</strong> Valeurs fixes comme "homepage", "checkout"</p>
              <p><strong>Contextuelles :</strong> Variables dynamiques comme "$page-name", "$user-id"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher une valeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => product && loadSuggestedValues(product.id)}
          title="Actualiser la liste"
          className="w-10 h-10 p-0 flex items-center justify-center ml-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* Suggested Values Table */}
      <DataTable
        data={filteredSuggestedValues}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Aucune valeur suggérée trouvée. Créez votre première valeur pour commencer."
      />

      {/* Stats Footer */}
      {!loading && suggestedValues.length > 0 && (
        <div className="text-sm text-neutral-500">
          {filteredSuggestedValues.length} valeur{filteredSuggestedValues.length !== 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredSuggestedValues.length !== 1 ? 's' : ''} sur ${suggestedValues.length})`}
        </div>
      )}

      {/* Create Suggested Value Modal */}
      <CreateSuggestedValueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />

      {/* Edit Suggested Value Modal */}
      <EditSuggestedValueModal
        isOpen={!!editSuggestedValue}
        suggestedValue={editSuggestedValue}
        onClose={() => setEditSuggestedValue(null)}
        onSubmit={handleEditSubmit}
        onDelete={handleDeleteSuggestedValue}
        onRefresh={async () => {
          if (product) {
            await loadSuggestedValues(product.id)
          }
        }}
        loading={editLoading}
      />
    </div>
  )
}

export { SuggestedValuesList }