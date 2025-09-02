import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { CreatePropertyModal } from '@/components/organisms/CreatePropertyModal'
import { propertiesApi, suggestedValuesApi } from '@/services/api'
import type { Property, SuggestedValue, CreatePropertyRequest, CreateSuggestedValueRequest } from '@/types'

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
  isValidated: boolean // true = propriété créée/validée, false = en cours d'édition
  keyError?: string
  valueError?: string
}

/**
 * Event Properties Input Component
 * Smart input for event properties with autocomplete from Properties library
 */
const EventPropertiesInput: React.FC<EventPropertiesInputProps> = ({
  productId,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [suggestedValues, setSuggestedValues] = useState<SuggestedValue[]>([])
  const [propertyValueAssociations, setPropertyValueAssociations] = useState<Record<string, string[]>>({})
  const [propertyEntries, setPropertyEntries] = useState<PropertyEntry[]>([])
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false)
  const [createPropertyLoading, setCreatePropertyLoading] = useState(false)
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [targetKeyEntryIndex, setTargetKeyEntryIndex] = useState(-1)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState<number | null>(null)
  const [showKeyDropdown, setShowKeyDropdown] = useState<number | null>(null)

  // Load properties and suggested values for the product
  useEffect(() => {
    loadPropertiesAndValues()
  }, [productId])

  // Handle click outside and escape key to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.relative')) {
        setShowSuggestionsDropdown(null)
        setShowKeyDropdown(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSuggestionsDropdown(null)
        setShowKeyDropdown(null)
      }
    }

    if (showSuggestionsDropdown !== null || showKeyDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showSuggestionsDropdown, showKeyDropdown])

  // Close dropdowns when modals open
  useEffect(() => {
    if (showCreatePropertyModal) {
      setShowSuggestionsDropdown(null)
      setShowKeyDropdown(null)
    }
  }, [showCreatePropertyModal])

  // Convert value object to entries when value changes
  useEffect(() => {
    const valueKeys = new Set(Object.keys(value || {}))
    const newEntries: PropertyEntry[] = []
    
    // First, preserve existing entries in their original order
    propertyEntries.forEach(existingEntry => {
      if (existingEntry.key.trim() || existingEntry.value.trim()) {
        if (valueKeys.has(existingEntry.key) && existingEntry.key.trim()) {
          // Update with new value from prop but keep order
          const val = value[existingEntry.key]
          newEntries.push({
            key: existingEntry.key,
            value: typeof val === 'string' ? val : JSON.stringify(val),
            isValidated: true, // Si c'est dans value, c'est validé
          })
          valueKeys.delete(existingEntry.key) // Mark as processed
        } else {
          // Keep existing entry as-is (partially filled or cleared)
          newEntries.push(existingEntry)
        }
      }
    })
    
    // Add any new entries from value that weren't in existing entries
    valueKeys.forEach(key => {
      const val = value[key]
      newEntries.push({
        key,
        value: typeof val === 'string' ? val : JSON.stringify(val),
        isValidated: true, // Si c'est dans value, c'est validé
      })
    })
    
    // Add empty entry if none exist
    if (newEntries.length === 0) {
      newEntries.push({ key: '', value: '', isValidated: false })
    }
    
    setPropertyEntries(newEntries)
  }, [value])

  const loadPropertiesAndValues = async () => {
    try {
      // Load properties for this product (includes propertyValues associations)
      const propertiesResponse = await propertiesApi.getByProduct(productId)
      const loadedProperties = propertiesResponse.data || []
      setProperties(loadedProperties)
      
      // Load suggested values for this product
      const suggestedValuesResponse = await suggestedValuesApi.getByProduct(productId)
      setSuggestedValues(suggestedValuesResponse.data || [])
      
      // Build property-value associations map
      const associations: Record<string, string[]> = {}
      loadedProperties.forEach((property: any) => {
        if (property.propertyValues && Array.isArray(property.propertyValues)) {
          associations[property.id] = property.propertyValues.map((pv: any) => pv.suggestedValue?.value).filter(Boolean)
        }
      })
      setPropertyValueAssociations(associations)
      
    } catch (error) {
      console.error('Error loading properties and suggested values:', error)
      setProperties([])
      setSuggestedValues([])
      setPropertyValueAssociations({})
    }
  }

  const updateEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = [...propertyEntries]
    newEntries[index] = { ...newEntries[index], [field]: newValue }
    
    // Clear errors when user types
    if (field === 'key') {
      delete newEntries[index].keyError
      // Show key dropdown when typing in key field and 3+ characters
      if (newValue.length >= 3) {
        setShowKeyDropdown(index)
      } else {
        setShowKeyDropdown(null)
      }
    } else if (field === 'value') {
      delete newEntries[index].valueError
      // Show suggestions dropdown only when typing in value field with 3+ characters
      if (newValue.length >= 3) {
        setShowSuggestionsDropdown(index)
      } else {
        setShowSuggestionsDropdown(null)
      }
    }
    
    // Auto-validate if both key and value are filled (values can be entered freely)
    if (newEntries[index].key.trim() && newEntries[index].value.trim()) {
      newEntries[index].isValidated = true
    } else {
      newEntries[index].isValidated = false
    }
    
    setPropertyEntries(newEntries)
    
    // Emit changes automatically for entries that have both key and value
    // This allows saving without needing to click "validate"
    emitChange(newEntries)
  }

  const addEntry = () => {
    const newEntries = [...propertyEntries, { key: '', value: '', isValidated: false }]
    setPropertyEntries(newEntries)
  }

  const removeEntry = (index: number) => {
    const newEntries = propertyEntries.filter((_, i) => i !== index)
    
    // If all entries are removed, add one empty entry
    if (newEntries.length === 0) {
      newEntries.push({ key: '', value: '', isValidated: false })
    }
    
    setPropertyEntries(newEntries)
    emitChange(newEntries)
  }

  const validateEntry = (index: number) => {
    const entry = propertyEntries[index]
    const newEntries = [...propertyEntries]
    
    // Clear previous errors
    delete newEntries[index].keyError
    delete newEntries[index].valueError
    
    // Validate required fields
    let hasError = false
    if (!entry.key.trim()) {
      newEntries[index].keyError = 'La clé est requise'
      hasError = true
    }
    if (!entry.value.trim()) {
      newEntries[index].valueError = 'La valeur est requise'
      hasError = true
    }
    
    if (hasError) {
      setPropertyEntries(newEntries)
      return
    }
    
    // Mark as validated and emit change
    newEntries[index].isValidated = true
    setPropertyEntries(newEntries)
    emitChange(newEntries)
  }

  const cancelEntry = (index: number) => {
    const entry = propertyEntries[index]
    
    // If it's an empty entry, remove it (unless it's the last one)
    if (!entry.key.trim() && !entry.value.trim()) {
      if (propertyEntries.length > 1) {
        removeEntry(index)
      } else {
        // Reset the entry
        const newEntries = [...propertyEntries]
        newEntries[index] = { key: '', value: '', isValidated: false }
        setPropertyEntries(newEntries)
      }
      return
    }
    
    // If it has content but was being edited, reset to empty state
    const newEntries = [...propertyEntries]
    newEntries[index] = { key: '', value: '', isValidated: false }
    delete newEntries[index].keyError
    delete newEntries[index].valueError
    setPropertyEntries(newEntries)
    emitChange(newEntries)
  }

  const emitChange = (entries: PropertyEntry[]) => {
    const result: Record<string, any> = {}
    
    entries.forEach(entry => {
      // Include all entries that have both key and value filled, regardless of validation status
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
    const existing = propertyEntries.map(e => e.key.toLowerCase())
    return properties
      .map(p => p.name)
      .filter(name => 
        name.toLowerCase().includes(currentKey.toLowerCase()) && 
        !existing.includes(name.toLowerCase())
      )
      .slice(0, 8)
  }

  const getValueSuggestions = (key: string, currentValue: string = ''): string[] => {
    // Find property by key
    const property = properties.find(p => p.name === key)
    
    let allSuggestions: string[] = []
    
    if (!property) {
      // If property doesn't exist, prioritize contextual values, then all values
      const contextualValues = suggestedValues
        .filter(sv => sv.is_contextual)
        .map(sv => sv.value)
      const staticValues = suggestedValues
        .filter(sv => !sv.is_contextual)
        .map(sv => sv.value)
      allSuggestions = [...contextualValues, ...staticValues]
    } else {
      // Get associated suggested values for this property
      const associatedValues = propertyValueAssociations[property.id] || []
      
      if (associatedValues.length > 0) {
        // Show associated values first, then contextual values as fallback
        const contextualValues = suggestedValues
          .filter(sv => sv.is_contextual && !associatedValues.includes(sv.value))
          .map(sv => sv.value)
        allSuggestions = [...associatedValues, ...contextualValues]
      } else {
        // No associations yet - show contextual values first, then all values
        const contextualValues = suggestedValues
          .filter(sv => sv.is_contextual)
          .map(sv => sv.value)
        const staticValues = suggestedValues
          .filter(sv => !sv.is_contextual)
          .map(sv => sv.value)
        allSuggestions = [...contextualValues, ...staticValues]
      }
    }
    
    // Filter suggestions based on current input (case insensitive) - minimum 3 characters
    if (currentValue && currentValue.trim().length >= 3) {
      const filtered = allSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(currentValue.toLowerCase().trim())
      )
      return filtered.slice(0, 10)
    }
    
    // Return all suggestions if input is less than 3 characters
    return allSuggestions.slice(0, 10)
  }

  const handleCreateProperty = async (data: CreatePropertyRequest) => {
    setCreatePropertyLoading(true)
    try {
      // Create property via API
      const response = await propertiesApi.create(productId, data)
      const newProperty = response.data
      
      // Update local state
      setProperties(prev => [...prev, newProperty])
      
      // Update the entry that triggered the creation
      if (targetKeyEntryIndex !== -1) {
        updateEntry(targetKeyEntryIndex, 'key', data.name)
      }
      
      setNewPropertyKey('')
      setTargetKeyEntryIndex(-1)
    } catch (error) {
      console.error('Error creating property:', error)
      throw error
    } finally {
      setCreatePropertyLoading(false)
    }
  }

  const handleCreatePropertyFromKey = (key: string, entryIndex: number) => {
    setNewPropertyKey(key)
    setTargetKeyEntryIndex(entryIndex)
    setShowCreatePropertyModal(true)
  }


  const handleCreateSuggestedValueFromDropdown = async (value: string, entryIndex: number) => {
    try {
      // Create suggested value directly without modal
      const data: CreateSuggestedValueRequest = {
        value: value.trim(),
        is_contextual: value.startsWith('$')
      }
      
      const response = await suggestedValuesApi.create(productId, data)
      const newSuggestedValue = response.data
      
      // Update local state
      setSuggestedValues(prev => [...prev, newSuggestedValue])
      
      // The value is already in the field, no need to update the entry
      // Just close the dropdown
      setShowSuggestionsDropdown(null)
      
      console.log('Suggested value created directly:', newSuggestedValue)
    } catch (error) {
      console.error('Error creating suggested value:', error)
      // If creation fails, the user can still use the value as-is
      setShowSuggestionsDropdown(null)
    }
  }


  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Propriétés de l'événement
        </label>
      </div>
      {/* Info */}
      <div className="text-sm text-neutral-500">
        <p>💡 <strong>Astuce :</strong> Les clés sont validées via les propriétés existantes. Les valeurs peuvent être saisies librement avec suggestions automatiques.</p>
      </div>

      {/* Property Entries */}
      <div className="space-y-3">
        {propertyEntries.map((entry, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 items-start">
            {/* Key Input */}
            <div className="col-span-3">
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
                  />
                  {/* Custom key dropdown for properties */}
                  {entry.key && entry.key.length >= 3 && showKeyDropdown === index && (
                    <div className="absolute top-full left-0 w-[250px] bg-white border border-neutral-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {getKeyAutocomplete(entry.key).length > 0 ? (
                        <>
                          {getKeyAutocomplete(entry.key).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                              onClick={() => {
                                updateEntry(index, 'key', suggestion)
                                setShowKeyDropdown(null) // Close dropdown
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                          {!getKeyAutocomplete(entry.key).some(s => s.toLowerCase() === entry.key.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm border-t border-neutral-200 text-green-700 font-medium"
                              onClick={() => {
                                handleCreatePropertyFromKey(entry.key, index)
                                setShowKeyDropdown(null)
                              }}
                            >
                              🔍 Créer "{entry.key}" comme nouvelle propriété
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm text-green-700 font-medium"
                          onClick={() => {
                            handleCreatePropertyFromKey(entry.key, index)
                            setShowKeyDropdown(null)
                          }}
                        >
                          🔍 Créer "{entry.key}" comme nouvelle propriété
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            {/* Value Input */}
            <div className="col-span-8">
              <FormField
                label={index === 0 ? "Valeur" : ""}
                error={entry.valueError}
              >
                <div className="relative">
                  <Input
                    value={entry.value}
                    onChange={(e) => updateEntry(index, 'value', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        setShowSuggestionsDropdown(null)
                      }
                    }}
                    placeholder="homepage, $page-name, 123..."
                    disabled={disabled}
                  />
                  {/* Custom suggestion dropdown for better UX */}
                  {showSuggestionsDropdown === index && entry.value && entry.value.length >= 3 && (
                    <div className="absolute top-full left-0 w-[250px] bg-white border border-neutral-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {getValueSuggestions(entry.key, entry.value).length > 0 ? (
                        <>
                          {getValueSuggestions(entry.key, entry.value).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                              onClick={() => {
                                updateEntry(index, 'value', suggestion)
                                setShowSuggestionsDropdown(null) // Close dropdown
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                          {entry.value && entry.value.trim() && !getValueSuggestions(entry.key, entry.value).some(s => s.toLowerCase() === entry.value.toLowerCase().trim()) && (
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm border-t border-neutral-200 text-green-700 font-medium"
                              onClick={() => {
                                handleCreateSuggestedValueFromDropdown(entry.value, index)
                                setShowSuggestionsDropdown(null)
                              }}
                            >
                              ✚ Créer "{entry.value}"
                            </button>
                          )}
                          <div className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 italic">
                            💡 Vous pouvez aussi saisir directement votre valeur
                          </div>
                        </>
                      ) : entry.value && entry.value.trim() ? (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm text-green-700 font-medium"
                          onClick={() => {
                            handleCreateSuggestedValueFromDropdown(entry.value, index)
                            setShowSuggestionsDropdown(null)
                          }}
                        >
                          ✚ Créer "{entry.value}"
                        </button>
                      ) : (
                        <div className="px-3 py-2 text-xs text-neutral-500 italic">
                          💡 Commencez à taper pour voir les suggestions ou créer une nouvelle valeur
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </FormField>
            </div>


            {/* Action Buttons */}
            <div className={`col-span-1 ${index === 0 ? "pt-6" : "pt-1"}`}>
              {entry.isValidated ? (
                // Property is validated - show only cancel (delete) button
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEntry(index)}
                  disabled={disabled}
                  className="text-red-600 hover:bg-red-50 border-red-200 w-full min-w-0"
                >
                  <span className="text-lg font-bold">×</span>
                </Button>
              ) : (
                // Property is being edited - show validate and cancel buttons
                <div className="flex space-x-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => validateEntry(index)}
                    disabled={disabled}
                    className="text-green-600 hover:bg-green-50 border-green-200 flex-1 min-w-0"
                  >
                    <span className="text-lg font-bold">✓</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cancelEntry(index)}
                    disabled={disabled}
                    className="text-red-600 hover:bg-red-50 border-red-200 flex-1 min-w-0"
                  >
                    <span className="text-lg font-bold">×</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Add Button */}
        <div className="flex justify-start">
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
      </div>

      {/* Global Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Create Property Modal */}
      <CreatePropertyModal
        isOpen={showCreatePropertyModal}
        onClose={() => {
          setShowCreatePropertyModal(false)
          setNewPropertyKey('')
          setTargetKeyEntryIndex(-1)
        }}
        onSubmit={handleCreateProperty}
        loading={createPropertyLoading}
        initialName={newPropertyKey}
      />


    </div>
  )
}

export { EventPropertiesInput }