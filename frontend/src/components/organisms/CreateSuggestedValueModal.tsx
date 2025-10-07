import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CreateSuggestedValueRequest } from '@/types'

interface CreateSuggestedValueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateSuggestedValueRequest) => Promise<void>
  loading?: boolean
  initialValue?: string
}

const CreateSuggestedValueModal: React.FC<CreateSuggestedValueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  initialValue = '',
}) => {
  const [formData, setFormData] = useState<CreateSuggestedValueRequest>({
    value: initialValue,
    is_contextual: initialValue.startsWith('$'),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [manualTypeSelection, setManualTypeSelection] = useState<boolean>(false)

  // Update form data when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setFormData({
        value: initialValue,
        is_contextual: initialValue.startsWith('$'),
      })
      setManualTypeSelection(false) // Reset manual selection flag
    }
  }, [initialValue])

  const handleClose = () => {
    if (!loading) {
      setFormData({ value: '', is_contextual: false })
      setErrors({})
      onClose()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.value.trim()) {
      newErrors.value = 'La valeur est requise'
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
        value: formData.value.trim(),
        is_contextual: formData.is_contextual,
      })
      handleClose()
    } catch (error) {
      console.error('Error creating suggested value:', error)
      setErrors({ submit: 'Erreur lors de la création de la valeur suggérée' })
    }
  }

  const handleValueChange = (value: string) => {
    // If not manually selected, auto-detect based on $
    if (!manualTypeSelection) {
      const isContextual = value.startsWith('$')
      setFormData({
        value,
        is_contextual: isContextual
      })
    } else {
      // If manual selection and contextual, ensure $ prefix
      let finalValue = value
      if (formData.is_contextual && !value.startsWith('$')) {
        finalValue = '$' + value
      }
      setFormData({
        ...formData,
        value: finalValue
      })
    }
  }

  const handleTypeChange = (isContextual: boolean) => {
    setManualTypeSelection(true)

    let newValue = formData.value

    if (isContextual && !newValue.startsWith('$')) {
      // Add $ prefix when switching to contextual
      newValue = '$' + newValue
    } else if (!isContextual && newValue.startsWith('$')) {
      // Remove $ prefix when switching to static
      newValue = newValue.substring(1)
    }

    setFormData({
      value: newValue,
      is_contextual: isContextual
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer une valeur suggérée"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selection */}
        <FormField
          label="Type de valeur"
          required
        >
          <select
            value={formData.is_contextual ? 'contextual' : 'static'}
            onChange={(e) => handleTypeChange(e.target.value === 'contextual')}
            disabled={loading}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <option value="static">Statique</option>
            <option value="contextual">Contextuelle</option>
          </select>
          <div className="text-sm text-neutral-500 mt-1">
            <p>• <strong>Statique :</strong> Valeur fixe (ex: "homepage", "checkout")</p>
            <p>• <strong>Contextuelle :</strong> Valeur variable avec préfixe $ (ex: "$page-name", "$user-id")</p>
          </div>
        </FormField>

        {/* Value */}
        <FormField
          label="Valeur"
          required
          error={errors.value}
        >
          <Input
            value={formData.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={formData.is_contextual ? "$page-name, $user-id..." : "homepage, checkout..."}
            disabled={loading}
          />
          {formData.is_contextual && !manualTypeSelection && (
            <div className="text-xs text-neutral-500 mt-1 italic">
              💡 Le symbole $ a été détecté automatiquement
            </div>
          )}
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
            Créer la valeur
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export { CreateSuggestedValueModal }