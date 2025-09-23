import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/molecules/FormField'
import type { CreateProductRequest } from '@/types'

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateProductRequest) => Promise<void>
  loading?: boolean
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    url: '',
    description: ''
  })
  const [errors, setErrors] = useState<Partial<CreateProductRequest>>({})
  const [serverError, setServerError] = useState<string>('')

  const handleInputChange = (field: keyof CreateProductRequest, value: string) => {
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
    const newErrors: Partial<CreateProductRequest> = {}
    
    if (!formData.name.trim()) {
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
    
    if (!validateForm()) return
    
    try {
      // Clear any previous server error
      setServerError('')
      
      await onSubmit({
        name: formData.name.trim(),
        url: formData.url?.trim() || undefined,
        description: formData.description?.trim() || undefined
      })
      
      // Reset form
      setFormData({ name: '', url: '', description: '' })
      setErrors({})
      setServerError('')
      onClose()
    } catch (error: any) {
      console.error('Error creating product:', error)
      
      // Extract error message from API response
      let errorMessage = 'Une erreur est survenue lors de la création du produit'
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setServerError(errorMessage)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', url: '', description: '' })
    setErrors({})
    setServerError('')
    onClose()
  }

  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} loading={loading}>
        Créer le produit
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Créer un nouveau produit"
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

export { CreateProductModal }