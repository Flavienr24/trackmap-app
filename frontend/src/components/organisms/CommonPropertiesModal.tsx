import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventCombobox, type EventOption } from '@/components/ui/event-combobox'
import { commonPropertiesApi, propertiesApi, suggestedValuesApi } from '@/services/api'
import type { CommonProperty, Property, SuggestedValue, CreateCommonPropertyRequest, UpdateCommonPropertyRequest } from '@/types'

interface CommonPropertiesModalProps {
  isOpen: boolean
  productId: string
  onClose: () => void
}

/**
 * CommonPropertiesModal
 * Manages default property-value pairs that are auto-filled in new events
 */
const CommonPropertiesModal: React.FC<CommonPropertiesModalProps> = ({
  isOpen,
  productId,
  onClose,
}) => {
  const [commonProperties, setCommonProperties] = useState<CommonProperty[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [suggestedValues, setSuggestedValues] = useState<SuggestedValue[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProperty, setNewProperty] = useState<CreateCommonPropertyRequest>({
    propertyId: '',
    suggestedValueId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateCommonPropertyRequest>({
    propertyId: '',
    suggestedValueId: '',
  })

  // Load data when modal opens (lite mode limits payload size)
  const loadData = useCallback(async () => {
    if (!isOpen || !productId) return

    setLoading(true)
    try {
      const [commonPropsResponse, propsResponse, valuesResponse] = await Promise.all([
        commonPropertiesApi.getByProduct(productId),
        propertiesApi.getByProduct(productId, { lite: 'true' } as any),
        suggestedValuesApi.getByProduct(productId, { lite: 'true' } as any),
      ])

      setCommonProperties(commonPropsResponse.data)
      setProperties(propsResponse.data)
      setSuggestedValues(valuesResponse.data)
    } catch (error) {
      console.error('Error loading common properties:', error)
    } finally {
      setLoading(false)
    }
  }, [isOpen, productId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get available properties (not already used as common properties)
  // When editing, keep the current property in the list to allow correction
  // Otherwise exclude all properties already mapped to common properties
  const availableProperties = properties.filter((prop) => {
    // Find if this property is used in a common property
    const usedInCommonProp = commonProperties.find((cp) => cp.propertyId === prop.id)

    // If not used anywhere, it's available
    if (!usedInCommonProp) return true

    // If we're editing and this is the property of the item being edited, keep it
    if (editingId && usedInCommonProp.id === editingId) return true

    // Otherwise, exclude it (already used in another common property)
    return false
  })

  // Convert properties to EventOption format for EventCombobox
  const propertyOptions: EventOption[] = availableProperties.map((prop) => ({
    value: prop.id,
    label: prop.name,
    description: prop.description,
  }))

  // Convert suggested values to EventOption format for EventCombobox
  const suggestedValueOptions: EventOption[] = suggestedValues.map((sv) => ({
    value: sv.id,
    label: sv.value,
    description: sv.isContextual ? 'Contextuel' : 'Statique',
  }))

  const handleClose = () => {
    setShowAddForm(false)
    setNewProperty({ propertyId: '', suggestedValueId: '' })
    setEditingId(null)
    setEditForm({ propertyId: '', suggestedValueId: '' })
    setErrors({})
    onClose()
  }

  const handleEditCommonProperty = (commonProp: CommonProperty) => {
    setEditingId(commonProp.id)
    setEditForm({
      propertyId: commonProp.propertyId,
      suggestedValueId: commonProp.suggestedValueId,
    })
    setShowAddForm(false) // Close add form if open
    setErrors({})
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ propertyId: '', suggestedValueId: '' })
    setErrors({})
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    if (!editForm.suggestedValueId) {
      setErrors({
        submit: 'Sélectionnez une valeur',
      })
      return
    }

    setActionLoading(editingId)
    try {
      await commonPropertiesApi.update(editingId, editForm)
      await loadData()
      setEditingId(null)
      setEditForm({ propertyId: '', suggestedValueId: '' })
      setErrors({})
    } catch (error) {
      console.error('Error updating common property:', error)
      setErrors({
        submit: (error as any)?.response?.message || 'Erreur lors de la mise à jour',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddCommonProperty = async () => {
    if (!newProperty.propertyId || !newProperty.suggestedValueId) {
      setErrors({
        submit: 'Sélectionnez une propriété et une valeur',
      })
      return
    }

    setActionLoading('add')
    try {
      await commonPropertiesApi.create(productId, newProperty)
      await loadData()
      setShowAddForm(false)
      setNewProperty({ propertyId: '', suggestedValueId: '' })
      setErrors({})
    } catch (error) {
      console.error('Error creating common property:', error)
      setErrors({
        submit: (error as any)?.response?.message || 'Erreur lors de la création',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCommonProperty = async (commonPropertyId: string) => {
    const commonProp = commonProperties.find((cp) => cp.id === commonPropertyId)
    if (!commonProp) return

    const confirmMessage = `Supprimer la propriété commune "${commonProp.property?.name}" ?`
    if (!window.confirm(confirmMessage)) return

    setActionLoading(commonPropertyId)
    try {
      await commonPropertiesApi.delete(commonPropertyId)
      await loadData()
    } catch (error) {
      console.error('Error deleting common property:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setActionLoading(null)
    }
  }

  const footer = (
    <div className="flex justify-between items-center">
      <Button
        onClick={() => setShowAddForm(true)}
        disabled={showAddForm || availableProperties.length === 0}
      >
        {availableProperties.length === 0 ? 'Aucune propriété disponible' : 'Ajouter une propriété commune'}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Propriétés communes"
      footer={footer}
      size="xl"
      fixedHeight
    >
      <div className="space-y-4">
        {/* Description */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Les propriétés communes sont automatiquement pré-remplies lors de la création de nouveaux events.
            Configurez les valeurs par défaut que vous utilisez le plus souvent.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            💡 <strong>Astuce :</strong> Cliquez sur une propriété commune pour la modifier.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-neutral-600">Chargement...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && commonProperties.length === 0 && !showAddForm && (
          <div className="text-center py-8 border border-dashed border-neutral-300 rounded-lg">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Aucune propriété commune configurée
            </h3>
            <p className="text-neutral-600 mb-4">
              Ajoutez des propriétés communes pour accélérer la création d'events
            </p>
            <Button onClick={() => setShowAddForm(true)} disabled={availableProperties.length === 0}>
              {availableProperties.length === 0 ? 'Aucune propriété disponible' : 'Ajouter une propriété commune'}
            </Button>
          </div>
        )}

        {/* Common Properties List */}
        {!loading && commonProperties.length > 0 && (
          <div className="space-y-2">
            {commonProperties.map((commonProp) => {
              const isEditing = editingId === commonProp.id

              return (
                <div
                  key={commonProp.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isEditing
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-neutral-200 hover:bg-neutral-50 cursor-pointer'
                  }`}
                  onClick={() => !isEditing && !actionLoading && handleEditCommonProperty(commonProp)}
                >
                  {isEditing ? (
                    // Edit mode
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-1">
                        <FormField label="Propriété" required>
                          <EventCombobox
                            value={editForm.propertyId || ''}
                            onChange={(value) => {
                              setEditForm({
                                propertyId: value,
                                suggestedValueId: '', // Reset value when property changes
                              })
                              setErrors({})
                            }}
                            options={propertyOptions}
                            placeholder="Sélectionner une propriété"
                            emptyMessage="Aucune propriété disponible"
                          />
                        </FormField>
                      </div>
                      <div className="text-2xl text-neutral-400">→</div>
                      <div className="flex-1">
                        <FormField label="Valeur" required>
                          <EventCombobox
                            value={editForm.suggestedValueId}
                            onChange={(value) => {
                              setEditForm({ ...editForm, suggestedValueId: value })
                              setErrors({})
                            }}
                            options={suggestedValueOptions}
                            placeholder="Sélectionner une valeur"
                            emptyMessage="Aucune valeur disponible"
                          />
                        </FormField>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelEdit()
                          }}
                          disabled={actionLoading === commonProp.id}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveEdit()
                          }}
                          loading={actionLoading === commonProp.id}
                          disabled={!editForm.suggestedValueId || actionLoading === commonProp.id}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900">
                            {commonProp.property?.name || 'Propriété inconnue'}
                          </div>
                          {commonProp.property?.description && (
                            <div className="text-sm text-neutral-500">
                              {commonProp.property.description}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl text-neutral-400">→</div>
                        <div className="flex-1">
                          <Badge
                            variant="outline"
                            className={`text-sm font-medium ${
                              commonProp.suggestedValue?.isContextual
                                ? 'border-purple-200 bg-purple-50 text-purple-800'
                                : 'border-slate-200 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {commonProp.suggestedValue?.value || 'Valeur inconnue'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCommonProperty(commonProp.id)
                        }}
                        loading={actionLoading === commonProp.id}
                        disabled={!!actionLoading}
                      >
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add Button (when list is not empty) */}
        {/* Add Form */}
        {showAddForm && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-neutral-900">Nouvelle propriété commune</h3>

            <FormField
              label="Propriété"
              required
              error={errors.property}
              hint="Choisissez la propriété à utiliser par défaut"
            >
              <EventCombobox
                value={newProperty.propertyId}
                onChange={(value) => {
                  setNewProperty({ ...newProperty, propertyId: value, suggestedValueId: '' })
                  setErrors({})
                }}
                options={propertyOptions}
                placeholder="Sélectionner une propriété"
                emptyMessage="Aucune propriété disponible"
                disabled={availableProperties.length === 0}
              />
            </FormField>

            {newProperty.propertyId && (
              <FormField
                label="Valeur par défaut"
                required
                error={errors.value}
                hint="Choisissez la valeur qui sera pré-remplie"
              >
                <EventCombobox
                  value={newProperty.suggestedValueId}
                  onChange={(value) => {
                    setNewProperty({ ...newProperty, suggestedValueId: value })
                    setErrors({})
                  }}
                  options={suggestedValueOptions}
                  placeholder="Sélectionner une valeur"
                  emptyMessage="Aucune valeur suggérée disponible"
                  disabled={suggestedValues.length === 0}
                />
              </FormField>
            )}

            {errors.submit && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setNewProperty({ propertyId: '', suggestedValueId: '' })
                  setErrors({})
                }}
                disabled={actionLoading === 'add'}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddCommonProperty}
                loading={actionLoading === 'add'}
                disabled={!newProperty.propertyId || !newProperty.suggestedValueId}
              >
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export { CommonPropertiesModal }
