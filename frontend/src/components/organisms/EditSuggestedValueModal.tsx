import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import type { SuggestedValue, UpdateSuggestedValueRequest } from '@/types'

interface EditSuggestedValueModalProps {
  isOpen: boolean
  suggestedValue: SuggestedValue | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateSuggestedValueRequest) => Promise<void>
  loading?: boolean
}

const EditSuggestedValueModal: React.FC<EditSuggestedValueModalProps> = ({
  isOpen,
  suggestedValue,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UpdateSuggestedValueRequest>({
    value: '',
    is_contextual: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when suggested value changes
  useEffect(() => {
    if (suggestedValue) {
      setFormData({
        value: suggestedValue.value,
        is_contextual: suggestedValue.is_contextual,
      })
      setErrors({})
    }
  }, [suggestedValue])

  const handleClose = () => {
    if (!loading) {
      setErrors({})
      onClose()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.value?.trim()) {
      newErrors.value = 'La valeur est requise'
    }

    // Auto-detect contextual values starting with $
    const isContextual = formData.value?.startsWith('$') || false
    setFormData(prev => ({ ...prev, is_contextual: isContextual }))

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!suggestedValue || !validateForm()) {
      return
    }

    try {
      await onSubmit(suggestedValue.id, {
        value: formData.value?.trim(),
        is_contextual: formData.value?.startsWith('$') || false,
      })
      handleClose()
    } catch (error) {
      console.error('Error updating suggested value:', error)
      setErrors({ submit: 'Erreur lors de la modification de la valeur suggérée' })
    }
  }

  const handleValueChange = (value: string) => {
    const isContextual = value.startsWith('$')
    setFormData({ 
      value, 
      is_contextual: isContextual 
    })
  }

  if (!suggestedValue) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Modifier la valeur suggérée"
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
            value={formData.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="homepage, checkout, $page-name, $user-id..."
            disabled={loading}
          />
          <div className="text-sm text-neutral-500 mt-1">
            <p>• <strong>Valeur statique :</strong> "homepage", "checkout"</p>
            <p>• <strong>Valeur contextuelle :</strong> "$page-name", "$user-id" (commence par $)</p>
          </div>
        </FormField>

        {/* Type indicator */}
        {formData.value && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Type détecté :</span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              formData.is_contextual 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {formData.is_contextual ? 'Contextuelle' : 'Statique'}
            </span>
          </div>
        )}

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
            Modifier la valeur
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export { EditSuggestedValueModal }