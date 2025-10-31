import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { eventsApi } from '@/services/api'
import type { Event, EventConflict, UpdateEventRequest } from '@/types'

interface ConflictResolutionModalProps {
  isOpen: boolean
  event: Event | null
  conflicts: EventConflict[]
  onClose: () => void
  onResolved: () => void
}

/**
 * ConflictResolutionModal
 * Shows conflicts between event properties and common properties
 * Allows manual resolution by applying common property values
 */
const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  event,
  conflicts,
  onClose,
  onResolved,
}) => {
  const [resolving, setResolving] = useState(false)
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())

  // Reset selection when modal opens/closes or event changes
  useEffect(() => {
    if (!isOpen || !event) {
      setSelectedConflicts(new Set())
    }
  }, [isOpen, event])

  if (!event || conflicts.length === 0) {
    return null
  }

  const handleToggleConflict = (propertyKey: string) => {
    const newSelected = new Set(selectedConflicts)
    if (newSelected.has(propertyKey)) {
      newSelected.delete(propertyKey)
    } else {
      newSelected.add(propertyKey)
    }
    setSelectedConflicts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedConflicts.size === conflicts.length) {
      setSelectedConflicts(new Set())
    } else {
      setSelectedConflicts(new Set(conflicts.map(c => c.propertyKey)))
    }
  }

  const handleApplyCommonValues = async () => {
    if (selectedConflicts.size === 0) {
      return
    }

    setResolving(true)
    try {
      // Build updated properties object
      let currentProperties: Record<string, any> = {}

      if (event.properties) {
        if (typeof event.properties === 'string') {
          try {
            currentProperties = JSON.parse(event.properties)
          } catch (error) {
            console.error('Failed to parse event properties:', error)
          }
        } else {
          currentProperties = event.properties as Record<string, any>
        }
      }

      // Apply selected common property values
      conflicts.forEach((conflict) => {
        if (selectedConflicts.has(conflict.propertyKey)) {
          currentProperties[conflict.propertyKey] = conflict.expectedValue
        }
      })

      // Update event with new properties
      const updateData: UpdateEventRequest = {
        properties: currentProperties,
      }

      await eventsApi.update(event.id, updateData)

      // Reset and notify parent
      setSelectedConflicts(new Set())
      onResolved()
      onClose()
    } catch (error) {
      console.error('Error resolving conflicts:', error)
      alert('Erreur lors de la résolution des conflits')
    } finally {
      setResolving(false)
    }
  }

  const footer = (
    <div className="flex justify-between items-center">
      <div className="text-sm text-neutral-600">
        {selectedConflicts.size} conflit{selectedConflicts.size !== 1 ? 's' : ''} sélectionné{selectedConflicts.size !== 1 ? 's' : ''}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} disabled={resolving}>
          Annuler
        </Button>
        <Button
          onClick={handleApplyCommonValues}
          loading={resolving}
          disabled={selectedConflicts.size === 0}
        >
          Appliquer les valeurs communes
        </Button>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Conflits détectés - ${event.name}`}
      footer={footer}
      size="xl"
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-sm text-amber-900 font-medium mb-1">
                {conflicts.length} propriété{conflicts.length > 1 ? 's' : ''} ne correspond{conflicts.length > 1 ? 'ent' : ''} pas aux valeurs communes
              </p>
              <p className="text-xs text-amber-700">
                Sélectionnez les propriétés à mettre à jour avec les valeurs communes configurées.
              </p>
            </div>
          </div>
        </div>

        {/* Select All */}
        {conflicts.length > 1 && (
          <div className="flex items-center gap-2 pb-2 border-b">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedConflicts.size === conflicts.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="select-all" className="text-sm font-medium text-neutral-700 cursor-pointer">
              Tout sélectionner
            </label>
          </div>
        )}

        {/* Conflicts List */}
        <div className="space-y-3">
          {conflicts.map((conflict) => {
            const isSelected = selectedConflicts.has(conflict.propertyKey)

            return (
              <div
                key={conflict.propertyKey}
                className={`border rounded-lg p-4 transition-colors ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleConflict(conflict.propertyKey)}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900 mb-2">
                      {conflict.propertyKey}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Valeur actuelle</div>
                        <Badge variant="secondary" className="font-mono text-sm">
                          {String(conflict.currentValue)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Valeur commune attendue</div>
                        <Badge variant="primary" className="font-mono text-sm">
                          {String(conflict.expectedValue)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Help Text */}
        <div className="text-xs text-neutral-500 bg-neutral-50 rounded p-3">
          💡 <strong>Astuce :</strong> Les propriétés communes sont des valeurs par défaut configurées au niveau du produit.
          Appliquer ces valeurs garantit la cohérence de votre tracking.
        </div>
      </div>
    </Modal>
  )
}

export { ConflictResolutionModal }
