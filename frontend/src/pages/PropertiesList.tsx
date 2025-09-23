import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Navigate, Link, useNavigate } from 'react-router'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Badge } from '@/components/atoms/Badge'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreatePropertyModal } from '@/components/organisms/CreatePropertyModal'
import { EditPropertyModal } from '@/components/organisms/EditPropertyModal'
import { propertiesApi, productsApi } from '@/services/api'
import { doesProductNameMatchSlug } from '@/utils/slug'
import type { Property, Product, CreatePropertyRequest, UpdatePropertyRequest } from '@/types'

/**
 * Properties List Page
 * Manages the properties library for a specific product
 * Properties define reusable data types and structures for events
 */
const PropertiesList: React.FC = () => {
  const { productName } = useParams<{ productName: string }>()
  const navigate = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editProperty, setEditProperty] = useState<Property | null>(null)
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
        navigate('/products', { replace: true })
        return null
      }
      setProduct(product)
      return product
    } catch (error) {
      console.error('Error loading product:', error)
      navigate('/products', { replace: true })
      return null
    }
  }, [productName, navigate, findProductBySlug])

  const loadProperties = useCallback(async (productId: string) => {
    try {
      // Load properties from library
      const propertiesResponse = await propertiesApi.getByProduct(productId)
      setProperties(propertiesResponse.data)
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load product first, then properties (which depends on product data)
      const productData = await loadProduct()
      if (productData) {
        await loadProperties(productData.id)
      }
    } finally {
      setLoading(false)
    }
  }, [loadProduct, loadProperties])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateProperty = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreatePropertyRequest) => {
    if (!product) return
    setCreateLoading(true)
    try {
      const response = await propertiesApi.create(product.id, data)
      console.log('Property created:', response.data)
      await loadProperties(product.id) // Reload the list
    } catch (error) {
      console.error('Error creating property:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditProperty = (property: Property) => {
    setEditProperty(property)
  }

  const handleEditSubmit = async (id: string, data: UpdatePropertyRequest) => {
    if (!product) return
    setEditLoading(true)
    try {
      const response = await propertiesApi.update(id, data)
      console.log('Property updated:', response.data)
      await loadProperties(product.id) // Reload the list
    } catch (error) {
      console.error('Error updating property:', error)
      throw error
    } finally {
      setEditLoading(false)
    }
  }

  // Function for deletion from modal (no confirmation needed - modal handles it)
  const handleDeletePropertyFromModal = async (property: Property) => {
    console.log('handleDeletePropertyFromModal called for:', property.name)
    try {
      await propertiesApi.delete(property.id)
      console.log('Property deleted:', property)
      if (product) await loadProperties(product.id) // Reload the list
    } catch (error) {
      console.error('Error deleting property:', error)
      throw error // Let the modal handle the error
    }
  }

  // Function for deletion directly from list (with confirmation and impact analysis)
  const handleDeletePropertyFromList = async (property: Property) => {
    console.log('handleDeletePropertyFromList called for:', property.name)
    
    try {
      // Try to get impact analysis first
      const response = await propertiesApi.getImpact(property.id)
      const impact = response.data
      
      if (impact.affectedEventsCount > 0) {
        // Show detailed confirmation with impact info
        const message = `Supprimer la propriété "${property.name}" ?\n\nCette action affectera ${impact.affectedEventsCount} event${impact.affectedEventsCount !== 1 ? 's' : ''} :\n${impact.affectedEvents.map(e => `• ${e.name} (${e.page})`).join('\n')}\n\nLes propriétés seront automatiquement supprimées de ces events.`
        
        if (window.confirm(message)) {
          await propertiesApi.delete(property.id)
          console.log('Property deleted with impact:', property)
          if (product) await loadProperties(product.id) // Reload the list
        }
      } else {
        // No impact - simple confirmation
        if (window.confirm(`Supprimer la propriété "${property.name}" ?`)) {
          await propertiesApi.delete(property.id)
          console.log('Property deleted:', property)
          if (product) await loadProperties(product.id) // Reload the list
        }
      }
    } catch (error) {
      console.error('Error during property deletion process:', error)
      
      // Fallback to simple confirmation if impact analysis fails
      if (window.confirm(`Supprimer la propriété "${property.name}" ?\n\n(Analyse d'impact indisponible)`)) {
        try {
          await propertiesApi.delete(property.id)
          console.log('Property deleted (fallback):', property)
          if (product) await loadProperties(product.id) // Reload the list
        } catch (deleteError) {
          console.error('Error deleting property:', deleteError)
          alert('Erreur lors de la suppression de la propriété')
        }
      }
    }
  }

  // Filter properties based on search query
  const filteredProperties = properties.filter(property => 
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (property.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    property.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Table columns configuration
  const columns: Column<Property>[] = [
    {
      key: 'name',
      title: 'Nom de la propriété',
      render: (value, record) => (
        <div>
          <div className="flex items-center">
            <span className="font-medium text-neutral-900">{value}</span>
          </div>
          {record.description && (
            <div className="text-sm text-neutral-500">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: '120px',
      render: (value) => {
        const typeVariants = {
          string: 'default',
          number: 'secondary', 
          boolean: 'outline',
          array: 'default',
          object: 'destructive',
        }
        const variant = typeVariants[value as keyof typeof typeVariants] || 'secondary'
        return (
          <Badge variant={variant as any}>
            {value}
          </Badge>
        )
      },
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
  const actions: Action<Property>[] = [
    {
      label: 'Modifier',
      onClick: handleEditProperty,
      variant: 'secondary',
    },
    {
      label: 'Supprimer',
      onClick: handleDeletePropertyFromList,
      variant: 'danger',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to={`/products/${productName}`}>Retour</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <Link to={`/products/${productName}`} className="hover:text-neutral-900">{product?.name || 'Chargement...'}</Link>
          <span>›</span>
          <span className="text-neutral-900 font-medium">Propriétés</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Bibliothèque des Propriétés
          </h1>
          <p className="text-neutral-600 mt-1">
            Propriétés de "{product?.name || 'Chargement...'}" • {properties.length} propriété{properties.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/products/${productName}/suggested-values`)}
          >
            Valeurs suggérées
          </Button>
          <Button variant="primary" onClick={handleCreateProperty}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer une propriété
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher une propriété..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => product && loadProperties(product.id)}
          title="Actualiser la liste"
          className="w-10 h-10 p-0 flex items-center justify-center ml-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* Properties Table */}
      <DataTable
        data={filteredProperties}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Aucune propriété trouvée. Créez votre première propriété pour commencer."
      />

      {/* Stats Footer */}
      {!loading && properties.length > 0 && (
        <div className="text-sm text-neutral-500">
          {filteredProperties.length} propriété{filteredProperties.length !== 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredProperties.length !== 1 ? 's' : ''} sur ${properties.length})`}
        </div>
      )}

      {/* Create Property Modal */}
      <CreatePropertyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />

      {/* Edit Property Modal */}
      <EditPropertyModal
        isOpen={!!editProperty}
        property={editProperty}
        onClose={() => setEditProperty(null)}
        onSubmit={handleEditSubmit}
        onDelete={handleDeletePropertyFromModal}
        loading={editLoading}
      />
    </div>
  )
}

export { PropertiesList }