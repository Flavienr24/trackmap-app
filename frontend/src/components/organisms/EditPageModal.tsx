import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { FormField } from '@/components/molecules/FormField'
import type { Page, UpdatePageRequest } from '@/types'

interface EditPageModalProps {
  isOpen: boolean
  page: Page | null
  onClose: () => void
  onSubmit: (id: string, data: UpdatePageRequest) => Promise<void>
  loading?: boolean
}

const EditPageModal: React.FC<EditPageModalProps> = ({
  isOpen,
  page,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<UpdatePageRequest>({
    name: '',
    url: ''
  })
  const [errors, setErrors] = useState<Partial<UpdatePageRequest>>({})

  // Initialize form when page changes
  useEffect(() => {
    if (page) {
      setFormData({
        name: page.name,
        url: page.url
      })
    }
  }, [page])

  const handleInputChange = (field: keyof UpdatePageRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdatePageRequest> = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom de la page est requis'
    }
    
    if (!formData.url?.trim()) {
      newErrors.url = 'L\'URL est requise'
    } else if (!isValidUrl(formData.url.trim())) {
      newErrors.url = 'Format d\'URL invalide'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      // Check if it's a relative URL pattern
      return url.startsWith('/') || url.includes('*') || url.includes(':')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!page || !validateForm()) return
    
    try {
      await onSubmit(page.id, {
        name: formData.name?.trim(),
        url: formData.url?.trim()
      })
      
      onClose()
    } catch (error) {
      console.error('Error updating page:', error)
    }
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  if (!page) return null

  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} loading={loading}>
        Sauvegarder
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Modifier "${page.name}"`}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nom de la page"
          required
          error={errors.name}
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: Homepage, Product Page, Checkout"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </FormField>

        <FormField
          label="URL de la page"
          required
          error={errors.url}
          hint="URL complète ou pattern avec * pour les pages dynamiques"
        >
          <input
            type="text"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            placeholder="Ex: https://site.fr/, /products/*, https://site.fr/checkout"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export { EditPageModal }