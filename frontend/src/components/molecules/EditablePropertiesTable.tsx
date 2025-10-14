/**
 * Editable Properties Table
 *
 * Interactive table for editing imported event properties.
 * Features:
 * - Inline editing for keys and values
 * - Status badges (NEW, EXISTS, SIMILAR)
 * - Suggestion application with learning
 * - Delete rows
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { learningEngine, type PropertyMatch } from '@/utils/eventParser'

interface EditableProperty {
  key: string
  value: string
  originalKey: string
  originalValue: string
  match?: PropertyMatch
}

interface EditablePropertiesTableProps {
  properties: Record<string, any>
  propertiesMatches?: Record<string, PropertyMatch>
  productId: string
  onChange: (properties: Record<string, any>) => void
  onApplySuggestion?: (key: string, newValue: string) => void
}

/**
 * Badge component for property status
 */
const PropertyBadge: React.FC<{
  type: 'new' | 'exists' | 'similar' | 'boosted'
  text?: string
}> = ({ type, text }) => {
  const styles = {
    new: 'bg-orange-100 text-orange-800 border-orange-300',
    exists: 'bg-green-100 text-green-800 border-green-300',
    similar: 'bg-blue-100 text-blue-800 border-blue-300',
    boosted: 'bg-purple-100 text-purple-800 border-purple-300'
  }

  const labels = {
    new: 'NEW',
    exists: '✓',
    similar: '~',
    boosted: '★'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[type]}`}>
      {text || labels[type]}
    </span>
  )
}

/**
 * Editable Properties Table Component
 */
export const EditablePropertiesTable: React.FC<EditablePropertiesTableProps> = ({
  properties,
  propertiesMatches = {},
  productId,
  onChange,
  onApplySuggestion
}) => {
  // Convert properties to editable entries
  const [entries, setEntries] = useState<EditableProperty[]>(() => {
    return Object.entries(properties).map(([key, value]) => ({
      key,
      value: String(value),
      originalKey: key,
      originalValue: String(value),
      match: propertiesMatches[key]
    }))
  })

  /**
   * Update entry value
   */
  const handleUpdateEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...entries]
    updated[index][field] = newValue
    setEntries(updated)

    // Emit changes
    emitChanges(updated)
  }

  /**
   * Delete entry
   */
  const handleDeleteEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index)
    setEntries(updated)
    emitChanges(updated)
  }

  /**
   * Apply suggestion for a value
   */
  const handleApplySuggestion = (index: number, suggestion: string) => {
    const entry = entries[index]
    const updated = [...entries]
    updated[index].value = suggestion
    setEntries(updated)

    // Record in learning engine
    learningEngine.recordAcceptedMatch(
      entry.originalValue,
      suggestion,
      productId,
      'value'
    )

    // Callback
    if (onApplySuggestion) {
      onApplySuggestion(entry.key, suggestion)
    }

    emitChanges(updated)
  }

  /**
   * Emit changes to parent
   */
  const emitChanges = (updatedEntries: EditableProperty[]) => {
    const result: Record<string, any> = {}
    updatedEntries.forEach(entry => {
      if (entry.key.trim()) {
        // Try to parse as number or boolean
        const trimmedValue = entry.value.trim()
        if (trimmedValue === 'true') {
          result[entry.key] = true
        } else if (trimmedValue === 'false') {
          result[entry.key] = false
        } else if (!isNaN(Number(trimmedValue)) && trimmedValue !== '') {
          result[entry.key] = Number(trimmedValue)
        } else {
          result[entry.key] = entry.value
        }
      }
    })
    onChange(result)
  }

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-slate-700">Clé</th>
            <th className="px-4 py-2 text-left font-medium text-slate-700">Valeur</th>
            <th className="px-4 py-2 text-left font-medium text-slate-700">Statut</th>
            <th className="px-4 py-2 text-center font-medium text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const match = entry.match
            const hasKeySuggestion = match && !match.keyExists && match.valueSimilar
            const hasValueSuggestion = match && match.valueSimilar

            return (
              <tr key={index} className="border-t border-slate-200">
                {/* Key input */}
                <td className="px-4 py-2">
                  <Input
                    value={entry.key}
                    onChange={(e) => handleUpdateEntry(index, 'key', e.target.value)}
                    className="font-mono text-xs"
                  />
                </td>

                {/* Value input */}
                <td className="px-4 py-2">
                  <div className="space-y-1">
                    <Input
                      value={entry.value}
                      onChange={(e) => handleUpdateEntry(index, 'value', e.target.value)}
                      className="font-mono text-xs"
                    />
                    {hasValueSuggestion && (
                      <div className="flex items-center space-x-2 text-xs text-blue-700">
                        <span>💡 Suggestion: <strong>{match.valueSimilar}</strong></span>
                        <button
                          type="button"
                          className="underline hover:text-blue-900"
                          onClick={() => handleApplySuggestion(index, match.valueSimilar!)}
                        >
                          Appliquer
                        </button>
                      </div>
                    )}
                  </div>
                </td>

                {/* Status badges */}
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {/* Key status */}
                    {match?.keyExists && <PropertyBadge type="exists" text="Clé ✓" />}
                    {match?.isNewKey && <PropertyBadge type="new" text="Clé NEW" />}

                    {/* Value status */}
                    {match?.valueExists && <PropertyBadge type="exists" text="Valeur ✓" />}
                    {match?.isNewValue && <PropertyBadge type="new" text="Valeur NEW" />}
                    {match?.boosted && <PropertyBadge type="boosted" text="Appris" />}
                  </div>
                </td>

                {/* Delete button */}
                <td className="px-4 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(index)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    ×
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
