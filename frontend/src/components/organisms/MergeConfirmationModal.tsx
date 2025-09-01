import React from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import type { SuggestedValueConflictData } from '@/types'

interface MergeConfirmationModalProps {
  isOpen: boolean
  conflictData: SuggestedValueConflictData | null
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/**
 * Merge Confirmation Modal
 * Asks user to confirm merging two suggested values that have the same value
 */
const MergeConfirmationModal: React.FC<MergeConfirmationModalProps> = ({
  isOpen,
  conflictData,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!conflictData) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Valeur existante détectée"
      size="md"
    >
      <div className="space-y-4">
        {/* Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Fusion intelligente suggérée</h3>
              <p className="text-sm text-blue-800 mt-1">
                La valeur "<strong>{conflictData.mergeProposal.keepValue}</strong>" existe déjà.
                Nous pouvons fusionner les deux valeurs pour éviter les doublons.
              </p>
            </div>
          </div>
        </div>

        {/* Merge Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm font-medium text-red-900 mb-1">Sera supprimée</div>
              <div className="text-sm text-red-700 font-mono bg-white px-2 py-1 rounded border">
                "{conflictData.mergeProposal.removeValue}"
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm font-medium text-green-900 mb-1">Sera conservée</div>
              <div className="text-sm text-green-700 font-mono bg-white px-2 py-1 rounded border">
                "{conflictData.mergeProposal.keepValue}"
              </div>
            </div>
          </div>

          <div className="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3">
            <strong>Ce qui va se passer :</strong>
            <ul className="mt-2 space-y-1">
              <li>• Toutes les associations avec "{conflictData.mergeProposal.removeValue}" seront transférées vers "{conflictData.mergeProposal.keepValue}"</li>
              <li>• La valeur "{conflictData.mergeProposal.removeValue}" sera définitivement supprimée</li>
              <li>• Aucune donnée ne sera perdue</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            loading={loading}
          >
            Fusionner les valeurs
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export { MergeConfirmationModal }