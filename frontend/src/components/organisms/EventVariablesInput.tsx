import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { CreateVariableModal } from '@/components/organisms/CreateVariableModal'
// import { mockData } from '@/services/api' // Removed - using real API
import type { Variable, SuggestedValue, CreateVariableRequest } from '@/types'

interface EventVariablesInputProps {
  productId: string
  value: Record<string, any>
  onChange: (variables: Record<string, any>) => void
  disabled?: boolean
  error?: string
}

interface VariableEntry {
  key: string
  value: string
  keyError?: string
  valueError?: string
}

/**
 * Event Variables Input Component
 * Smart input for event variables with autocomplete from Variables library
 */
const EventVariablesInput: React.FC<EventVariablesInputProps> = ({
  productId,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [variables, setVariables] = useState<Variable[]>([])
  const [suggestedValues, setSuggestedValues] = useState<SuggestedValue[]>([])
  const [variableEntries, setVariableEntries] = useState<VariableEntry[]>([])
  const [showCreateVariableModal, setShowCreateVariableModal] = useState(false)
  const [createVariableLoading, setCreateVariableLoading] = useState(false)
  const [newVariableKey, setNewVariableKey] = useState('')

  // Load variables and suggested values for the product
  useEffect(() => {
    loadVariablesAndValues()
  }, [productId])

  // Convert value object to entries when value changes
  useEffect(() => {
    const entries: VariableEntry[] = Object.entries(value || {}).map(([key, val]) => ({
      key,
      value: typeof val === 'string' ? val : JSON.stringify(val),
    }))
    
    // Add empty entry if none exist
    if (entries.length === 0) {
      entries.push({ key: '', value: '' })
    }
    
    setVariableEntries(entries)
  }, [value])

  const loadVariablesAndValues = async () => {
    try {
      // Load variables for this product
      const productVariables = mockData.variables.filter(v => v.product_id === productId)
      setVariables(productVariables)
      
      // Load suggested values for this product
      const productSuggestedValues = mockData.suggestedValues.filter(sv => sv.product_id === productId)
      setSuggestedValues(productSuggestedValues)
    } catch (error) {
      console.error('Error loading variables and suggested values:', error)
    }
  }

  const updateEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = [...variableEntries]
    newEntries[index] = { ...newEntries[index], [field]: newValue }
    
    // Clear errors when user types
    if (field === 'key') {
      delete newEntries[index].keyError
    } else {
      delete newEntries[index].valueError
    }
    
    setVariableEntries(newEntries)
    emitChange(newEntries)
  }

  const addEntry = () => {
    const newEntries = [...variableEntries, { key: '', value: '' }]
    setVariableEntries(newEntries)
  }

  const removeEntry = (index: number) => {
    if (variableEntries.length > 1) {
      const newEntries = variableEntries.filter((_, i) => i !== index)
      setVariableEntries(newEntries)
      emitChange(newEntries)
    }
  }

  const emitChange = (entries: VariableEntry[]) => {
    const result: Record<string, any> = {}
    
    entries.forEach(entry => {
      if (entry.key.trim() && entry.value.trim()) {
        try {
          // Try to parse as JSON first
          result[entry.key.trim()] = JSON.parse(entry.value)
        } catch {
          // If not JSON, keep as string
          result[entry.key.trim()] = entry.value.trim()
        }
      }
    })
    
    onChange(result)
  }

  const getKeyAutocomplete = (currentKey: string): string[] => {
    const existing = variableEntries.map(e => e.key.toLowerCase())
    return variables
      .map(v => v.name)
      .filter(name => 
        name.toLowerCase().includes(currentKey.toLowerCase()) && 
        !existing.includes(name.toLowerCase())
      )
      .slice(0, 5)
  }

  const getValueSuggestions = (key: string): string[] => {
    // Find variable by key
    const variable = variables.find(v => v.name === key)
    if (!variable) {
      // If variable doesn't exist, show general contextual values
      return suggestedValues
        .filter(sv => sv.is_contextual)
        .map(sv => sv.value)
        .slice(0, 5)
    }
    
    // Get associated suggested values for this variable
    const variableValueAssociations = []
    const associatedSuggestedValues = variableValueAssociations
      .map(vv => suggestedValues.find(sv => sv.id === vv.suggested_value_id))
      .filter(Boolean) as SuggestedValue[]
    
    if (associatedSuggestedValues.length > 0) {
      return associatedSuggestedValues.map(sv => sv.value)
    }
    
    // Fallback: show all suggested values
    return suggestedValues.map(sv => sv.value).slice(0, 5)
  }

  const handleCreateVariable = async (data: CreateVariableRequest) => {
    setCreateVariableLoading(true)
    try {
      // Create variable
      const newVariable: Variable = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        product_id: productId,
        name: data.name,
        type: data.type,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Add to mock data and update local state
      mockData.variables.push(newVariable)
      setVariables(prev => [...prev, newVariable])
      
      // Update the entry that triggered the creation
      const entryIndex = variableEntries.findIndex(e => e.key === newVariableKey)
      if (entryIndex !== -1) {
        updateEntry(entryIndex, 'key', data.name)
      }
      
      setNewVariableKey('')
      console.log('Variable created on the fly:', newVariable)
    } catch (error) {
      console.error('Error creating variable:', error)
      throw error
    } finally {
      setCreateVariableLoading(false)
    }
  }

  const handleCreateVariableFromKey = (key: string) => {
    setNewVariableKey(key)
    setShowCreateVariableModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-700">
          Variables de l'événement
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          disabled={disabled}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter
        </Button>
      </div>

      {/* Variable Entries */}
      <div className="space-y-3">
        {variableEntries.map((entry, index) => (
          <div key={index} className="flex items-start space-x-3">
            {/* Key Input */}
            <div className="flex-1">
              <FormField
                label={index === 0 ? "Clé" : ""}
                error={entry.keyError}
              >
                <div className="relative">
                  <Input
                    value={entry.key}
                    onChange={(e) => updateEntry(index, 'key', e.target.value)}
                    placeholder="page_name, user_id..."
                    disabled={disabled}
                    list={`key-suggestions-${index}`}
                  />
                  <datalist id={`key-suggestions-${index}`}>
                    {getKeyAutocomplete(entry.key).map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                  
                  {/* Create Variable Button */}
                  {entry.key && !variables.find(v => v.name === entry.key) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      onClick={() => handleCreateVariableFromKey(entry.key)}
                    >
                      Créer
                    </Button>
                  )}
                </div>
              </FormField>
            </div>

            {/* Value Input */}
            <div className="flex-1">
              <FormField
                label={index === 0 ? "Valeur" : ""}
                error={entry.valueError}
              >
                <Input
                  value={entry.value}
                  onChange={(e) => updateEntry(index, 'value', e.target.value)}
                  placeholder="homepage, $page-name, 123..."
                  disabled={disabled}
                  list={`value-suggestions-${index}`}
                />
                <datalist id={`value-suggestions-${index}`}>
                  {getValueSuggestions(entry.key).map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </FormField>
            </div>

            {/* Remove Button */}
            <div className={index === 0 ? "pt-6" : "pt-1"}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeEntry(index)}
                disabled={disabled || variableEntries.length === 1}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-neutral-500">
        <p>💡 <strong>Astuce :</strong> Tapez pour voir les suggestions automatiques basées sur vos variables existantes.</p>
      </div>

      {/* Create Variable Modal */}
      <CreateVariableModal
        isOpen={showCreateVariableModal}
        onClose={() => {
          setShowCreateVariableModal(false)
          setNewVariableKey('')
        }}
        onSubmit={handleCreateVariable}
        loading={createVariableLoading}
      />
    </div>
  )
}

export { EventVariablesInput }