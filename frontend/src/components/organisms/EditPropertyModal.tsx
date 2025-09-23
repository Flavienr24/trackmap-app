import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/simple-select'
import { Button } from '@/components/ui/button'
import { propertiesApi } from '@/services/api'
import type { Property, UpdatePropertyRequest, PropertyType, PropertyImpactData } from '@/types'

interface EditPropertyModalProps {
  isOpen: boolean
  property: Property | null
  onClose: () => void
  onSubmit: (id: string, data: UpdatePropertyRequest) => Promise<void>
  onDelete?: (property: Property) => Promise<void>
  loading?: boolean
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  isOpen,
  property,
  onClose,
  onSubmit,
  onDelete,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UpdatePropertyRequest>({
    name: '',
    type: 'string',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [impactData, setImpactData] = useState<PropertyImpactData | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)

  // Update form data when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        type: property.type,
        description: property.description || '',
      })
      setErrors({})
    }
  }, [property])

  const handleClose = () => {
    if (!loading) {
      setErrors({})
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!property || !onDelete) return
    
    setImpactLoading(true)
    try {
      // Try to get impact analysis
      const response = await propertiesApi.getImpact(property.id)
      const impact = response.data
      
      if (impact.affectedEventsCount > 0) {
        // Impact detected - show detailed confirmation
        setImpactData(impact)
        onClose()
        setShowDeleteConfirmation(true)
      } else {
        // No impact - simple confirmation is enough
        if (window.confirm(`Supprimer la propriété "${property.name}" ?`)) {
          await onDelete(property)
          onClose()
        }
      }
    } catch (error) {
      console.error('Error getting impact analysis, using simple confirmation:', error)
      // API error - fallback to simple confirmation
      if (window.confirm(`Supprimer la propriété "${property.name}" ?`)) {
        try {
          await onDelete(property)
          onClose()
        } catch (deleteError) {
          console.error('Error deleting property:', deleteError)
        }
      }
    } finally {
      setImpactLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!property || !onDelete) return
    
    try {
      await onDelete(property)
      setShowDeleteConfirmation(false)
      setImpactData(null)
      // Don't call handleClose() since the main modal is already closed
    } catch (error) {
      console.error('Error deleting property:', error)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setImpactData(null)
    // Note: We could reopen the main modal here, but it's cleaner to just close everything
    // If needed, the parent component can manage reopening the edit modal
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom de la propriété est requis'
    }

    if (!formData.type) {
      newErrors.type = 'Le type de propriété est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!property || !validateForm()) {
      return
    }

    try {
      await onSubmit(property.id, {
        name: formData.name?.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
      })
      handleClose()
    } catch (error) {
      console.error('Error updating property:', error)
      setErrors({ submit: 'Erreur lors de la modification de la propriété' })
    }
  }

  const typeOptions: { value: PropertyType; label: string }[] = [
    { value: 'string', label: 'String (Texte)' },
    { value: 'number', label: 'Number (Nombre)' },
    { value: 'boolean', label: 'Boolean (Vrai/Faux)' },
    { value: 'array', label: 'Array (Tableau)' },
    { value: 'object', label: 'Object (Objet)' },
  ]

  if (!property) return null


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
                  Suppression de la propriété "{property.name}"
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
                <strong>{impactData.affectedEventsCount}</strong> event{impactData.affectedEventsCount !== 1 ? 's' : ''} utilise{impactData.affectedEventsCount !== 1 ? 'nt' : ''} cette propriété et ser{impactData.affectedEventsCount !== 1 ? 'ont' : 'a'} automatiquement mis à jour.
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
                      <div className="text-neutral-500">{event.page} • Valeur actuelle: {JSON.stringify(event.propertyValue)}</div>
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
      title="Modifier la propriété"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Name */}
        <FormField
          label="Nom de la propriété"
          required
          error={errors.name}
        >
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="page_name, user_id, transaction_value..."
            disabled={loading}
          />
        </FormField>

        {/* Property Type */}
        <FormField
          label="Type de données"
          required
          error={errors.type}
        >
          <SimpleSelect
            value={formData.type}
            onChange={(value: string) => setFormData({ ...formData, type: value as PropertyType })}
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
        <div className="flex justify-between pt-4">
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={loading || impactLoading}
              loading={impactLoading}
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
    </>
  )
}

export { EditPropertyModal }