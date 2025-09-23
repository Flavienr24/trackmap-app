import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MergeConfirmationModal } from '@/components/organisms/MergeConfirmationModal'
import { suggestedValuesApi } from '@/services/api'
import type { SuggestedValue, UpdateSuggestedValueRequest, SuggestedValueConflictData, SuggestedValueImpactData } from '@/types'

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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [impactData, setImpactData] = useState<SuggestedValueImpactData | null>(null)
  const [_impactLoading, setImpactLoading] = useState(false)

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
    
    setImpactLoading(true)
    try {
      // Try to get impact analysis
      const response = await suggestedValuesApi.getImpact(suggestedValue.id)
      const impact = response.data
      
      if (impact.affectedEventsCount > 0) {
        // Impact detected - show detailed confirmation
        setImpactData(impact)
        onClose()
        setShowDeleteConfirmation(true)
      } else {
        // No impact - simple confirmation is enough
        if (window.confirm(`Supprimer la valeur "${suggestedValue.value}" ?`)) {
          await onDelete(suggestedValue)
          onClose()
        }
      }
    } catch (error) {
      console.error('Error getting impact analysis, using simple confirmation:', error)
      // API error - fallback to simple confirmation
      if (window.confirm(`Supprimer la valeur "${suggestedValue.value}" ?`)) {
        try {
          await onDelete(suggestedValue)
          onClose()
        } catch (deleteError) {
          console.error('Error deleting suggested value:', deleteError)
        }
      }
    } finally {
      setImpactLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!suggestedValue || !onDelete) return
    
    try {
      await onDelete(suggestedValue)
      setShowDeleteConfirmation(false)
      handleClose()
    } catch (error) {
      console.error('Error deleting suggested value:', error)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setImpactData(null)
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
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && impactData && (
        <Modal
          isOpen={showDeleteConfirmation}
          onClose={handleCancelDelete}
          title="Confirmer la suppression"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-neutral-900">
                  Suppression de la valeur "{suggestedValue.value}"
                </h3>
                <div className="mt-2 text-sm text-neutral-600">
                  Cette action est irréversible et aura les conséquences suivantes :
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-yellow-800">Impact sur les events</span>
              </div>
              <p className="text-sm text-yellow-700">
                <strong>{impactData.affectedEventsCount}</strong> event{impactData.affectedEventsCount !== 1 ? 's' : ''} utilise{impactData.affectedEventsCount !== 1 ? 'nt' : ''} cette valeur et ser{impactData.affectedEventsCount !== 1 ? 'ont' : 'a'} automatiquement mis à jour.
              </p>
            </div>

            {/* Affected Events List */}
            {impactData.affectedEventsCount > 0 && (
              <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg">
                <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-700">
                  Events affectés
                </div>
                <div className="divide-y divide-neutral-200">
                  {impactData.affectedEvents.map((event) => (
                    <div key={event.id} className="px-3 py-2 text-sm">
                      <div className="font-medium text-neutral-900">{event.name}</div>
                      <div className="text-neutral-500">{event.page}</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        Propriétés affectées: {event.matchingProperties.map(p => `${p.key}: ${JSON.stringify(p.value)}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                loading={loading}
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Main Edit Modal */}
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
              Supprimer
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
              Modifier
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