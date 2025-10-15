import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CreateSuggestedValueRequest } from '@/types'
import { isContextualValue } from '@/utils/contextualValue'

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
    isContextual: isContextualValue(initialValue),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [manualTypeSelection, setManualTypeSelection] = useState<boolean>(false)

  // Update form data when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setFormData({
        value: initialValue,
        isContextual: isContextualValue(initialValue),
      })
      setManualTypeSelection(false) // Reset manual selection flag
    }
  }, [initialValue])

  const handleClose = () => {
    if (!loading) {
      setFormData({ value: '', isContextual: false })
      setErrors({})
      onClose()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.value.trim()) {
      newErrors.value = 'La valeur est requise'
    }

    // Validate that contextual values actually contain a variable pattern
    if (formData.isContextual && !isContextualValue(formData.value)) {
      newErrors.value = 'Une valeur contextuelle doit contenir une variable (ex: $page-name, category:$name)'
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
        isContextual: formData.isContextual,
      })
      handleClose()
    } catch (error) {
      console.error('Error creating suggested value:', error)
      setErrors({ submit: 'Erreur lors de la création de la valeur suggérée' })
    }
  }

  const handleValueChange = (value: string) => {
    // If not manually selected, auto-detect based on variable pattern
    if (!manualTypeSelection) {
      const detected = isContextualValue(value)
      setFormData({
        value,
        isContextual: detected
      })
    } else {
      // If manual selection is active, keep the user's choice
      setFormData({
        ...formData,
        value: value
      })
    }
  }

  const handleTypeChange = (isContextual: boolean) => {
    setManualTypeSelection(true)

    // Keep the value as-is when manually changing type
    // No automatic prefix manipulation since $ can be anywhere in the string
    setFormData({
      value: formData.value,
      isContextual: isContextual
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
        {/* Value */}
        <FormField
          label="Valeur"
          required
          error={errors.value}
        >
          <Input
            value={formData.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={formData.isContextual ? "$page-name, $user-id..." : "homepage, checkout..."}
            disabled={loading}
          />
          {formData.isContextual && !manualTypeSelection && (
            <div className="text-xs text-neutral-500 mt-1 italic">
              💡 Le symbole $ a été détecté automatiquement
            </div>
          )}
        </FormField>

        {/* Type Selection */}
        <FormField
          label="Type de valeur"
          required
        >
          <select
            value={formData.isContextual ? 'contextual' : 'static'}
            onChange={(e) => handleTypeChange(e.target.value === 'contextual')}
            disabled={loading}
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="static">Statique</option>
            <option value="contextual">Contextuelle</option>
          </select>
          <div className="text-sm text-neutral-500 mt-1">
            <p>• <strong>Statique :</strong> Valeur fixe (ex: "homepage", "checkout")</p>
            <p>• <strong>Contextuelle :</strong> Valeur variable avec préfixe $ (ex: "$page-name", "$user-id")</p>
          </div>
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