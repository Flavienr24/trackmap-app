import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { FormField } from '@/components/molecules/FormField'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { commonPropertiesApi, propertiesApi, suggestedValuesApi } from '@/services/api'
import type { CommonProperty, Property, SuggestedValue, CreateCommonPropertyRequest } from '@/types'

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

  // Load data when modal opens
  const loadData = useCallback(async () => {
    if (!isOpen || !productId) return

    setLoading(true)
    try {
      const [commonPropsResponse, propsResponse, valuesResponse] = await Promise.all([
        commonPropertiesApi.getByProduct(productId),
        propertiesApi.getByProduct(productId),
        suggestedValuesApi.getByProduct(productId),
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
  const availableProperties = properties.filter(
    (prop) => !commonProperties.some((cp) => cp.propertyId === prop.id)
  )

  const handleClose = () => {
    setShowAddForm(false)
    setNewProperty({ propertyId: '', suggestedValueId: '' })
    setErrors({})
    onClose()
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
            {commonProperties.map((commonProp) => (
              <div
                key={commonProp.id}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
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
                  onClick={() => handleDeleteCommonProperty(commonProp.id)}
                  loading={actionLoading === commonProp.id}
                  disabled={!!actionLoading}
                >
                  Supprimer
                </Button>
              </div>
            ))}
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
              <Select
                value={newProperty.propertyId}
                onValueChange={(value) => {
                  setNewProperty({ ...newProperty, propertyId: value, suggestedValueId: '' })
                  setErrors({})
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une propriété" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-neutral-500">
                      Aucune propriété disponible
                    </div>
                  ) : (
                    availableProperties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        <div>
                          <div>{prop.name}</div>
                          {prop.description && (
                            <div className="text-xs text-neutral-500">{prop.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>

            {newProperty.propertyId && (
              <FormField
                label="Valeur par défaut"
                required
                error={errors.value}
                hint="Choisissez la valeur qui sera pré-remplie"
              >
                <Select
                  value={newProperty.suggestedValueId}
                  onValueChange={(value) => {
                    setNewProperty({ ...newProperty, suggestedValueId: value })
                    setErrors({})
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une valeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedValues.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-neutral-500">
                        Aucune valeur suggérée disponible
                      </div>
                    ) : (
                      suggestedValues.map((value) => (
                        <SelectItem key={value.id} value={value.id}>
                          <div className="flex items-center space-x-2">
                            <span>{value.value}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${
                                value.isContextual
                                  ? 'border-purple-200 bg-purple-50 text-purple-800'
                                  : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}
                            >
                              {value.isContextual ? 'Contextuel' : 'Statique'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
