import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { MergeConfirmationModal } from '@/components/organisms/MergeConfirmationModal'
import { suggestedValuesApi } from '@/services/api'
import type { SuggestedValue, UpdateSuggestedValueRequest, SuggestedValueConflictData } from '@/types'

interface EditSuggestedValueModalProps {
  isOpen: boolean
  suggestedValue: SuggestedValue | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateSuggestedValueRequest) => Promise<void>
  onDelete?: (suggestedValue: SuggestedValue) => Promise<void>
  onRefresh?: () => Promise<void>
  loading?: boolean
}

const EditSuggestedValueModal: React.FC<EditSuggestedValueModalProps> = ({
  isOpen,
  suggestedValue,
  onClose,
  onSubmit,
  onDelete,
  onRefresh,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UpdateSuggestedValueRequest>({
    value: '',
    is_contextual: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictData, setConflictData] = useState<SuggestedValueConflictData | null>(null)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)

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
    if (!loading && !mergeLoading) {
      setErrors({})
      setConflictData(null)
      setShowMergeModal(false)
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
    } catch (error: any) {
      console.error('Error updating suggested value:', error)
      
      // Check if this is a conflict error with merge data
      if (error.response?.status === 409 && error.response?.data?.error === 'suggested_value_exists') {
        setConflictData(error.response.data.conflictData)
        setShowMergeModal(true)
        setErrors({}) // Clear any previous errors
      } else {
        setErrors({ submit: 'Erreur lors de la modification de la valeur suggérée' })
      }
    }
  }

  const handleMergeConfirm = async () => {
    if (!suggestedValue || !conflictData) return

    setMergeLoading(true)
    try {
      // Merge: remove current (source), keep existing (target)
      await suggestedValuesApi.merge(suggestedValue.id, conflictData.existingValue.id)
      
      // Close modals and refresh the list
      setShowMergeModal(false)
      setConflictData(null)
      handleClose()
      
      // Trigger parent refresh
      if (onRefresh) {
        await onRefresh()
      }
      
    } catch (error) {
      console.error('Error merging suggested values:', error)
      setErrors({ submit: 'Erreur lors de la fusion des valeurs suggérées' })
    } finally {
      setMergeLoading(false)
    }
  }

  const handleMergeCancel = () => {
    setShowMergeModal(false)
    setConflictData(null)
  }

  const handleDelete = async () => {
    if (!suggestedValue || !onDelete) return
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la valeur "${suggestedValue.value}" ?`)) {
      try {
        await onDelete(suggestedValue)
        handleClose()
      } catch (error) {
        console.error('Error deleting suggested value:', error)
      }
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
    <>
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
        <div className="flex justify-between pt-4">
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
            >
              Supprimer la valeur
            </Button>
          )}
          <div className="flex space-x-3 ml-auto">
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
        </div>
      </form>
    </Modal>

    {/* Merge Confirmation Modal */}
    <MergeConfirmationModal
      isOpen={showMergeModal}
      conflictData={conflictData}
      onConfirm={handleMergeConfirm}
      onCancel={handleMergeCancel}
      loading={mergeLoading}
    />
    </>
  )
}

export { EditSuggestedValueModal }