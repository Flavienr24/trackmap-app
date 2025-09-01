import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Button } from '@/components/atoms/Button'
import type { CreatePropertyRequest, PropertyType } from '@/types'

interface CreatePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePropertyRequest) => Promise<void>
  loading?: boolean
  initialName?: string
}

const CreatePropertyModal: React.FC<CreatePropertyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  initialName = '',
}) => {
  const [formData, setFormData] = useState<CreatePropertyRequest>({
    name: initialName,
    type: 'string',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Update form data when initialName changes
  useEffect(() => {
    if (initialName) {
      setFormData(prev => ({
        ...prev,
        name: initialName,
      }))
    }
  }, [initialName])

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      // Use setTimeout to ensure the modal is fully rendered
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', type: 'string', description: '' })
      setErrors({})
      onClose()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la propriété est requis'
    }

    if (!formData.type) {
      newErrors.type = 'Le type de propriété est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
      })
      handleClose()
    } catch (error) {
      console.error('Error creating property:', error)
      setErrors({ submit: 'Erreur lors de la création de la propriété' })
    }
  }

  const typeOptions: { value: PropertyType; label: string }[] = [
    { value: 'string', label: 'String (Texte)' },
    { value: 'number', label: 'Number (Nombre)' },
    { value: 'boolean', label: 'Boolean (Vrai/Faux)' },
    { value: 'array', label: 'Array (Tableau)' },
    { value: 'object', label: 'Object (Objet)' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer une propriété"
      size="md"
    >
      <div className="space-y-4">
        {/* Property Name */}
        <FormField
          label="Nom de la propriété"
          required
          error={errors.name}
        >
          <Input
            ref={nameInputRef}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="page_name, user_id, transaction_value..."
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
        </FormField>

        {/* Property Type */}
        <FormField
          label="Type de données"
          required
          error={errors.type}
        >
          <Select
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as PropertyType })}
            options={typeOptions}
            disabled={loading}
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          error={errors.description}
        >
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de l'usage de cette propriété..."
            disabled={loading}
            rows={3}
            className="block w-full rounded-md border border-neutral-300 bg-white text-neutral-900 px-3 py-2 text-sm transition-colors duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </FormField>

        {/* Submit Error */}
        {errors.submit && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Créer la propriété
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export { CreatePropertyModal }