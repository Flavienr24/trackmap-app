import React, { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Button } from '@/components/atoms/Button'
import type { CreateVariableRequest, VariableType } from '@/types'

interface CreateVariableModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateVariableRequest) => Promise<void>
  loading?: boolean
}

const CreateVariableModal: React.FC<CreateVariableModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CreateVariableRequest>({
    name: '',
    type: 'string',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      newErrors.name = 'Le nom de la variable est requis'
    }

    if (!formData.type) {
      newErrors.type = 'Le type de variable est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      console.error('Error creating variable:', error)
      setErrors({ submit: 'Erreur lors de la création de la variable' })
    }
  }

  const typeOptions: { value: VariableType; label: string }[] = [
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
      title="Créer une variable"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Variable Name */}
        <FormField
          label="Nom de la variable"
          required
          error={errors.name}
        >
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="page_name, user_id, transaction_value..."
            disabled={loading}
          />
        </FormField>

        {/* Variable Type */}
        <FormField
          label="Type de données"
          required
          error={errors.type}
        >
          <Select
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as VariableType })}
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
            placeholder="Description de l'usage de cette variable..."
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
            type="submit"
            variant="primary"
            loading={loading}
          >
            Créer la variable
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export { CreateVariableModal }