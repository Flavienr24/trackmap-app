import React, { useState, useEffect } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { BackLink } from '@/components/atoms/BackLink'
import { DataTable, type Column, type Action } from '@/components/organisms/DataTable'
import { CreateVariableModal } from '@/components/organisms/CreateVariableModal'
import { EditVariableModal } from '@/components/organisms/EditVariableModal'
import { mockData } from '@/services/api'
import type { Variable, CreateVariableRequest, UpdateVariableRequest } from '@/types'

/**
 * Variables List Page
 * Manages the variables library for a specific product
 * Variables define reusable data types and structures for events
 */
const VariablesList: React.FC = () => {
  const { productId } = useParams<{ productId: string }>()
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editVariable, setEditVariable] = useState<Variable | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Find the product to display its name
  const product = mockData.products.find(p => p.id === productId)

  // Redirect if product not found
  if (!product) {
    return <Navigate to="/products" replace />
  }

  // Load variables on component mount
  useEffect(() => {
    loadVariables()
  }, [productId])

  const loadVariables = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await variablesApi.getByProduct(productId!)
      // setVariables(response.data)
      
      // Mock data simulation
      setTimeout(() => {
        const productVariables = mockData.variables.filter(v => v.product_id === productId)
        setVariables(productVariables)
        setLoading(false)
      }, 300)
    } catch (error) {
      console.error('Error loading variables:', error)
      setLoading(false)
    }
  }

  const handleCreateVariable = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateVariableRequest) => {
    setCreateLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await variablesApi.create(productId!, data)
      
      // Mock data simulation
      const newVariable: Variable = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        product_id: productId!,
        name: data.name,
        type: data.type,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Add to global mockData and reload
      mockData.variables.unshift(newVariable)
      const productVariables = mockData.variables.filter(v => v.product_id === productId)
      setVariables(productVariables)
      console.log('Variable created:', newVariable)
    } catch (error) {
      console.error('Error creating variable:', error)
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditVariable = (variable: Variable) => {
    setEditVariable(variable)
  }

  const handleEditSubmit = async (id: string, data: UpdateVariableRequest) => {
    setEditLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await variablesApi.update(id, data)
      
      // Update in global mockData and reload
      const updatedVariable = { ...data, updated_at: new Date().toISOString() }
      const index = mockData.variables.findIndex(v => v.id === id)
      if (index !== -1) {
        mockData.variables[index] = { ...mockData.variables[index], ...updatedVariable }
      }
      const productVariables = mockData.variables.filter(v => v.product_id === productId)
      setVariables(productVariables)
      console.log('Variable updated:', { id, ...data })
    } catch (error) {
      console.error('Error updating variable:', error)
      throw error
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteVariable = async (variable: Variable) => {
    console.log('handleDeleteVariable called for:', variable.name)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la variable "${variable.name}" ?`)) {
      try {
        // TODO: Replace with real API call
        // await variablesApi.delete(variable.id)
        
        // Remove from global mockData and reload
        const index = mockData.variables.findIndex(v => v.id === variable.id)
        if (index !== -1) {
          mockData.variables.splice(index, 1)
        }
        const productVariables = mockData.variables.filter(v => v.product_id === productId)
        setVariables(productVariables)
        console.log('Variable deleted:', variable)
      } catch (error) {
        console.error('Error deleting variable:', error)
      }
    }
  }

  // Filter variables based on search query
  const filteredVariables = variables.filter(variable => 
    variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (variable.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    variable.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Table columns configuration
  const columns: Column<Variable>[] = [
    {
      key: 'name',
      title: 'Nom de la variable',
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
      key: 'type',
      title: 'Type',
      width: '120px',
      render: (value) => {
        const typeColors = {
          string: 'bg-blue-100 text-blue-800',
          number: 'bg-green-100 text-green-800',
          boolean: 'bg-purple-100 text-purple-800',
          array: 'bg-orange-100 text-orange-800',
          object: 'bg-red-100 text-red-800',
        }
        const colorClass = typeColors[value as keyof typeof typeColors] || 'bg-neutral-100 text-neutral-800'
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
            {value}
          </span>
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
  const actions: Action<Variable>[] = [
    {
      label: 'Modifier',
      onClick: handleEditVariable,
      variant: 'secondary',
    },
    {
      label: 'Supprimer',
      onClick: handleDeleteVariable,
      variant: 'danger',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackLink to={`/products/${productId}`}>Retour</BackLink>
        <nav className="flex items-center space-x-2 text-sm text-neutral-600">
          <Link to="/products" className="hover:text-neutral-900">Produits</Link>
          <span>›</span>
          <Link to={`/products/${productId}`} className="hover:text-neutral-900">{product.name}</Link>
          <span>›</span>
          <span className="text-neutral-900 font-medium">Variables</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Variables Library
          </h1>
          <p className="text-neutral-600 mt-1">
            Variables de "{product.name}" • {variables.length} variable{variables.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateVariable}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une variable
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Rechercher une variable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={loadVariables}
          title="Actualiser la liste"
          className="w-10 h-10 p-0 flex items-center justify-center ml-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* Variables Table */}
      <DataTable
        data={filteredVariables}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Aucune variable trouvée. Créez votre première variable pour commencer."
      />

      {/* Stats Footer */}
      {!loading && variables.length > 0 && (
        <div className="text-sm text-neutral-500">
          {filteredVariables.length} variable{filteredVariables.length !== 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredVariables.length !== 1 ? 's' : ''} sur ${variables.length})`}
        </div>
      )}

      {/* Create Variable Modal */}
      <CreateVariableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />

      {/* Edit Variable Modal */}
      <EditVariableModal
        isOpen={!!editVariable}
        variable={editVariable}
        onClose={() => setEditVariable(null)}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />
    </div>
  )
}

export { VariablesList }