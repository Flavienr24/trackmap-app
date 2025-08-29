import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'

interface EventPropertiesInputProps {
  productId: string
  value: Record<string, any>
  onChange: (properties: Record<string, any>) => void
  disabled?: boolean
  error?: string
}

interface PropertyEntry {
  key: string
  value: string
  keyError?: string
  valueError?: string
}

/**
 * Event Properties Input Component - Simplified Version
 * Smart input for event properties with basic key-value editing
 */
const EventPropertiesInput: React.FC<EventPropertiesInputProps> = ({
  productId,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [entries, setEntries] = useState<PropertyEntry[]>(() => {
    const initialEntries: PropertyEntry[] = Object.entries(value || {}).map(([key, val]) => ({
      key,
      value: String(val),
    }))
    return initialEntries.length > 0 ? initialEntries : [{ key: '', value: '' }]
  })

  const updateParent = (newEntries: PropertyEntry[]) => {
    const result: Record<string, any> = {}
    newEntries.forEach(entry => {
      if (entry.key.trim()) {
        result[entry.key.trim()] = entry.value
      }
    })
    onChange(result)
  }

  const handleEntryChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = [...entries]
    newEntries[index] = { ...newEntries[index], [field]: newValue }
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const addEntry = () => {
    const newEntries = [...entries, { key: '', value: '' }]
    setEntries(newEntries)
  }

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      const newEntries = entries.filter((_, i) => i !== index)
      setEntries(newEntries)
      updateParent(newEntries)
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        label="Propriétés de l'événement"
        error={error}
      >
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <Input
                  value={entry.key}
                  onChange={(e) => handleEntryChange(index, 'key', e.target.value)}
                  placeholder="Nom de la propriété..."
                  disabled={disabled}
                />
              </div>
              <div className="flex-1">
                <Input
                  value={entry.value}
                  onChange={(e) => handleEntryChange(index, 'value', e.target.value)}
                  placeholder="Valeur..."
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => removeEntry(index)}
                disabled={disabled || entries.length === 1}
                className="w-10 h-10 p-0 flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          ))}
        </div>

        {/* Add Entry Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addEntry}
          disabled={disabled}
          className="w-full mt-3"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une propriété
        </Button>
      </FormField>

      {/* Info */}
      <div className="text-sm text-neutral-500">
        <p>💡 <strong>Astuce :</strong> Ajoutez les propriétés qui seront envoyées avec cet événement GA4.</p>
      </div>
    </div>
  )
}

export { EventPropertiesInput }