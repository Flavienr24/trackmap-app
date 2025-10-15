import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateSuggestedValueModal } from '@/components/organisms/CreateSuggestedValueModal'
import { EditSuggestedValueModal } from '@/components/organisms/EditSuggestedValueModal'
import { suggestedValuesApi } from '@/services/api'
import { useProduct } from '@/hooks/useProduct'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { SuggestedValue, Product, CreateSuggestedValueRequest, UpdateSuggestedValueRequest } from '@/types'

/**
 * Suggested Values List Page
 * Manages suggested values for a specific product
 * Suggested values can be static ("homepage") or contextual ("$page-name")
 */
const SuggestedValuesList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const { products, loadProducts, isLoading: productsLoading } = useProduct()
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

  const loadSuggestedValues = useCallback(async (productId: string) => {
    try {
      const response = await suggestedValuesApi.getByProduct(productId)
      setSuggestedValues(response.data)
    } catch (error) {
      console.error('Error loading suggested values:', error)
    }
  }, [])

  // Ensure products are available
  useEffect(() => {
    if (!products.length) {
      loadProducts()
    }
  }, [products.length, loadProducts])

  // Resolve the product from the slug
  useEffect(() => {
    if (!productName) return

    const target = products.find(p => doesProductNameMatchSlug(p.name, productName)) || null

    if (target) {
      setProduct(target)
    } else if (!productsLoading && products.length > 0) {
      console.error('Product not found for slug:', productName)
      setProduct(null)
      setLoading(false)
    }
  }, [products, productsLoading, productName])

  // Load suggested values when the product is ready
  useEffect(() => {
    let isActive = true

    if (!product) {
      return
    }

    const fetchValues = async () => {
      setLoading(true)
      try {
        await loadSuggestedValues(product.id)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchValues()

    return () => {
      isActive = false
    }
  }, [product, loadSuggestedValues])

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
      render: (value) => (
        <div className="font-medium text-neutral-900">
          {value}
        </div>
      ),
    },
    {
      key: 'isContextual',
      title: 'Type',
      width: '120px',
      render: (value) => (
        <Badge
          variant={value ? 'secondary' : 'default'}
          className={value ? 'bg-purple-100 text-purple-800 hover:bg-purple-100' : ''}
        >
          {value ? 'Contextuelle' : 'Statique'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Créée le',
      width: '160px',
      render: (value) => (
        <span>{new Date(value).toLocaleDateString('fr-FR')}</span>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Modifiée le',
      width: '160px',
      render: (value) => (
        <span>{new Date(value).toLocaleDateString('fr-FR')}</span>
      ),
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
    <div className="w-full space-y-6">
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
        onRefresh={() => product ? loadSuggestedValues(product.id) : Promise.resolve()}
        loading={editLoading}
      />
    </div>
  )
}

export { SuggestedValuesList }
export default SuggestedValuesList
