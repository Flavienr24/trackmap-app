/**
 * Bulk Event Importer Component
 *
 * Allows users to import event data from various formats (JSON, CSV, Excel, Jira).
 * Features:
 * - Multi-format parsing with intelligent detection
 * - Duplicate detection using import context
 * - Fallback mode if context fails to load
 * - Preview with editable properties before submission
 */

import { useState } from 'react'
import { useImportContext } from '@/hooks/useImportContext'
import { parseEventData, type EnhancedParseResult, type ParseResult } from '@/utils/eventParser'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EditablePropertiesTable } from '@/components/molecules/EditablePropertiesTable'

interface BulkEventImporterProps {
  productId: string
  onValidated: (data: ParsedImportData) => void
  onCancel: () => void
}

export interface ParsedImportData {
  eventName: string
  properties: Record<string, any>
  confidence: 'high' | 'medium' | 'low'
  warnings?: string[]
  suggestions?: string[]
}

/**
 * Bulk Event Importer Component
 */
export const BulkEventImporter: React.FC<BulkEventImporterProps> = ({
  productId,
  onValidated,
  onCancel
}) => {
  const [rawInput, setRawInput] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | EnhancedParseResult | null>(null)
  const [useFallbackMode, setUseFallbackMode] = useState(false)

  // Editable state for preview mode
  const [editableEventName, setEditableEventName] = useState('')
  const [editableProperties, setEditableProperties] = useState<Record<string, any>>({})

  // Fetch import context with React Query
  const {
    data: context,
    isLoading: contextLoading,
    isError: contextError
  } = useImportContext(productId, { enabled: !useFallbackMode })

  /**
   * Handle parse button click
   */
  const handleParse = () => {
    if (!rawInput.trim()) return

    // Parse with or without context depending on mode
    const result = useFallbackMode
      ? parseEventData(rawInput)
      : parseEventData(rawInput, context, productId)

    setParseResult(result)

    // Initialize editable state
    if (result.success) {
      setEditableEventName(result.eventName || '')
      setEditableProperties(result.properties || {})
    }
  }

  /**
   * Handle validation and pass data to parent
   */
  const handleValidate = () => {
    if (!parseResult || !parseResult.success) return

    // Use edited values
    const data: ParsedImportData = {
      eventName: editableEventName,
      properties: editableProperties,
      confidence: parseResult.confidence,
      warnings: parseResult.warnings,
      suggestions: parseResult.suggestions
    }

    onValidated(data)
  }

  /**
   * Reset to input mode
   */
  const handleReset = () => {
    setParseResult(null)
  }

  // Loading state
  if (contextLoading && !useFallbackMode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-600">Chargement du contexte de parsing...</p>
      </div>
    )
  }

  // Error state with fallback option
  if (contextError && !useFallbackMode) {
    return (
      <Card className="border-orange-300 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">Erreur de chargement</h3>
              <p className="text-sm text-orange-800 mb-4">
                Impossible de charger les données de référence pour la détection de doublons.
              </p>
              <div className="flex space-x-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setUseFallbackMode(true)}
                >
                  Continuer sans détection
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show fallback warning if active
  const showFallbackWarning = useFallbackMode

  // Input mode
  if (!parseResult) {
    return (
      <div className="space-y-4">
        {showFallbackWarning && (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-sm text-blue-900">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Mode simplifié : la détection de doublons est désactivée</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Collez vos données ici
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Formats acceptés : JSON, CSV/Excel, tableau Jira, ligne par ligne (clé: valeur)
          </p>
          <textarea
            className="w-full h-64 px-3 py-2 border border-slate-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Exemple JSON:
{
  "event": "purchase",
  "currency": "EUR",
  "value": 99.99,
  "method": "card"
}

Ou Excel (copié-collé):
event    purchase
currency EUR
value    99.99`}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={handleParse} disabled={!rawInput.trim()}>
            Analyser
          </Button>
        </div>
      </div>
    )
  }

  // Preview mode
  if (parseResult.success) {
    return (
      <div className="space-y-4">
        {/* Success header */}
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold text-green-900">Données analysées avec succès</span>
                <span className="ml-3 text-sm text-green-700">
                  Confiance: {parseResult.confidence === 'high' ? 'Haute' : parseResult.confidence === 'medium' ? 'Moyenne' : 'Faible'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        {parseResult.warnings && parseResult.warnings.length > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Avertissements</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                {parseResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {parseResult.suggestions && parseResult.suggestions.length > 0 && (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Suggestions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {parseResult.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Event name (editable) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom de l'événement
          </label>
          <Input
            value={editableEventName}
            onChange={(e) => setEditableEventName(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Properties (editable table) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Propriétés ({Object.keys(editableProperties).length})
          </label>
          <EditablePropertiesTable
            properties={editableProperties}
            propertiesMatches={'propertiesMatches' in parseResult ? parseResult.propertiesMatches : undefined}
            productId={productId}
            onChange={setEditableProperties}
          />
        </div>

        {/* Summary */}
        {('propertiesMatches' in parseResult && parseResult.propertiesMatches) && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Résumé des actions</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                {(() => {
                  const matches = parseResult.propertiesMatches!
                  const newProps = Object.values(matches).filter(m => m.isNewKey).length
                  const newVals = Object.values(matches).filter(m => m.isNewValue).length
                  const existingProps = Object.values(matches).filter(m => m.keyExists).length

                  return (
                    <>
                      {newProps > 0 && (
                        <li className="text-orange-700">• {newProps} nouvelle(s) propriété(s) sera(ont) créée(s)</li>
                      )}
                      {newVals > 0 && (
                        <li className="text-orange-700">• {newVals} nouvelle(s) valeur(s) sera(ont) ajoutée(s)</li>
                      )}
                      {existingProps > 0 && (
                        <li className="text-green-700">• {existingProps} propriété(s) existante(s) réutilisée(s)</li>
                      )}
                    </>
                  )
                })()}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleReset}>
            Modifier
          </Button>
          <Button onClick={handleValidate}>
            Valider et remplir le formulaire
          </Button>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="space-y-4">
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Erreur de parsing</h3>
              <ul className="text-sm text-red-800 space-y-1">
                {parseResult.errors?.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleReset}>
          Corriger les données
        </Button>
      </div>
    </div>
  )
}
