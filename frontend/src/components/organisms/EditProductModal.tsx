import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/molecules/FormField'
import type { Product, UpdateProductRequest } from '@/types'

interface EditProductModalProps {
  isOpen: boolean
  product: Product | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateProductRequest) => Promise<void>
  onDelete?: (product: Product) => Promise<void>
  loading?: boolean
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onSubmit,
  onDelete,
  loading = false
}) => {
  const [formData, setFormData] = useState<UpdateProductRequest>({
    name: '',
    url: '',
    description: ''
  })
  const [errors, setErrors] = useState<Partial<UpdateProductRequest>>({})
  const [serverError, setServerError] = useState<string>('')

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        url: product.url,
        description: product.description || ''
      })
      setServerError('') // Clear server error when product changes
    }
  }, [product])

  const handleInputChange = (field: keyof UpdateProductRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear server error when user makes changes
    if (serverError) {
      setServerError('')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdateProductRequest> = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom est requis'
    }

    // Validate URL format if provided
    if (formData.url && formData.url.trim()) {
      const urlRegex = /^https?:\/\/.+\..+/i
      if (!urlRegex.test(formData.url.trim())) {
        newErrors.url = 'L\'URL doit commencer par http:// ou https://'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!product || !validateForm()) return
    
    try {
      // Clear any previous server error
      setServerError('')
      
      await onSubmit(product.id, {
        name: formData.name?.trim(),
        url: formData.url?.trim(),
        description: formData.description?.trim() || undefined
      })
      
      onClose()
    } catch (error: any) {
      console.error('Error updating product:', error)
      
      // Extract error message from API response
      let errorMessage = 'Une erreur est survenue lors de la modification du produit'
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setServerError(errorMessage)
    }
  }

  const handleClose = () => {
    setErrors({})
    setServerError('')
    onClose()
  }

  const handleDelete = async () => {
    if (!product || !onDelete) return
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`)) {
      try {
        await onDelete(product)
        onClose()
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  if (!product) return null

  const footer = (
    <div className="flex justify-between">
      {onDelete && (
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading}
        >
          Supprimer
        </Button>
      )}
      <div className="flex space-x-3 ml-auto">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Sauvegarder
        </Button>
      </div>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Modifier "${product.name}"`}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nom du produit"
          required
          error={errors.name || serverError}
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: E-commerce Mobile App"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </FormField>

        <FormField
          label="URL du produit"
          error={errors.url}
        >
          <input
            type="url"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            placeholder="https://exemple.com"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Description"
          error={errors.description}
        >
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Description du produit (optionnel)"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export { EditProductModal }