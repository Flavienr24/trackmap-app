import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/molecules/FormField'
import type { CreatePageRequest } from '@/types'

interface CreatePageModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePageRequest) => Promise<void>
  loading?: boolean
}

const CreatePageModal: React.FC<CreatePageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreatePageRequest>({
    name: '',
    url: ''
  })
  const [errors, setErrors] = useState<Partial<CreatePageRequest>>({})

  const handleInputChange = (field: keyof CreatePageRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<CreatePageRequest> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la page est requis'
    }

    if (!formData.url || !formData.url.trim()) {
      newErrors.url = 'L\'URL de la page est requise'
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

    if (!validateForm()) return

    try {
      await onSubmit({
        name: formData.name.trim(),
        url: formData.url.trim()
      })

      // Reset form and close modal
      setFormData({ name: '', url: '' })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating page:', error)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', url: '' })
    setErrors({})
    onClose()
  }

  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} loading={loading}>
        Créer la page
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Ajouter une nouvelle page"
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nom de la page"
          required
          error={errors.name}
        >
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: Homepage, Product Page, Checkout"
            disabled={loading}
          />
        </FormField>

        <FormField
          label="URL de la page"
          required
          error={errors.url}
          hint="URL ou pattern pour identifier la page"
        >
          <Input
            type="text"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            placeholder="Ex: /homepage, /products/*, /checkout"
            className="font-mono"
            disabled={loading}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export { CreatePageModal }