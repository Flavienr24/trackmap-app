import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { CreatePropertyModal } from '@/components/organisms/CreatePropertyModal'
import { propertiesApi, suggestedValuesApi, propertyValuesApi } from '@/services/api'
import type { Property, SuggestedValue, PropertyValue, CreatePropertyRequest } from '@/types'

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
  description: string
  keyError?: string
  valueError?: string
  descriptionError?: string
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

  // Load properties and suggested values for the product
  useEffect(() => {
    loadPropertiesAndValues()
  }, [productId])

  // Convert value object to entries when value changes
  useEffect(() => {
    const valueKeys = new Set(Object.keys(value || {}))
    const newEntries: PropertyEntry[] = []
    
    // First, preserve existing entries in their original order
    propertyEntries.forEach(existingEntry => {
      if (existingEntry.key.trim() || existingEntry.value.trim() || existingEntry.description.trim()) {
        if (valueKeys.has(existingEntry.key) && existingEntry.key.trim()) {
          // Update with new value from prop but keep description and order
          const val = value[existingEntry.key]
          newEntries.push({
            key: existingEntry.key,
            value: typeof val === 'string' ? val : JSON.stringify(val),
            description: existingEntry.description,
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
        description: '',
      })
    })
    
    // Add empty entry if none exist
    if (newEntries.length === 0) {
      newEntries.push({ key: '', value: '', description: '' })
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

  const updateEntry = (index: number, field: 'key' | 'value' | 'description', newValue: string) => {
    const newEntries = [...propertyEntries]
    newEntries[index] = { ...newEntries[index], [field]: newValue }
    
    // Clear errors when user types
    if (field === 'key') {
      delete newEntries[index].keyError
    } else if (field === 'value') {
      delete newEntries[index].valueError
    } else if (field === 'description') {
      delete newEntries[index].descriptionError
    }
    
    setPropertyEntries(newEntries)
    
    // Only emit change for key/value changes, not description
    if (field !== 'description') {
      emitChange(newEntries)
    }
  }

  const addEntry = () => {
    const newEntries = [...propertyEntries, { key: '', value: '', description: '' }]
    setPropertyEntries(newEntries)
  }

  const removeEntry = (index: number) => {
    if (propertyEntries.length > 1) {
      const newEntries = propertyEntries.filter((_, i) => i !== index)
      setPropertyEntries(newEntries)
      emitChange(newEntries)
    }
  }

  const emitChange = (entries: PropertyEntry[]) => {
    const result: Record<string, any> = {}
    
    entries.forEach(entry => {
      // Only include entries that have both key and value filled
      // But don't filter out entries from the UI - let them stay for editing
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
      .slice(0, 5)
  }

  const getValueSuggestions = (key: string): string[] => {
    // Find property by key
    const property = properties.find(p => p.name === key)
    
    if (!property) {
      // If property doesn't exist, prioritize contextual values, then all values
      const contextualValues = suggestedValues
        .filter(sv => sv.is_contextual)
        .map(sv => sv.value)
      const staticValues = suggestedValues
        .filter(sv => !sv.is_contextual)
        .map(sv => sv.value)
      return [...contextualValues, ...staticValues].slice(0, 8)
    }
    
    // Get associated suggested values for this property
    const associatedValues = propertyValueAssociations[property.id] || []
    
    if (associatedValues.length > 0) {
      // Show associated values first, then contextual values as fallback
      const contextualValues = suggestedValues
        .filter(sv => sv.is_contextual && !associatedValues.includes(sv.value))
        .map(sv => sv.value)
      return [...associatedValues, ...contextualValues].slice(0, 8)
    }
    
    // No associations yet - show contextual values first, then all values
    const contextualValues = suggestedValues
      .filter(sv => sv.is_contextual)
      .map(sv => sv.value)
    const staticValues = suggestedValues
      .filter(sv => !sv.is_contextual)
      .map(sv => sv.value)
    return [...contextualValues, ...staticValues].slice(0, 8)
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
      const entryIndex = propertyEntries.findIndex(e => e.key === newPropertyKey)
      if (entryIndex !== -1) {
        updateEntry(entryIndex, 'key', data.name)
      }
      
      setNewPropertyKey('')
      console.log('Property created on the fly:', newProperty)
    } catch (error) {
      console.error('Error creating property:', error)
      throw error
    } finally {
      setCreatePropertyLoading(false)
    }
  }

  const handleCreatePropertyFromKey = (key: string) => {
    setNewPropertyKey(key)
    setShowCreatePropertyModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Propriétés de l'événement
        </label>
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
                    list={`key-suggestions-${index}`}
                  />
                  <datalist id={`key-suggestions-${index}`}>
                    {getKeyAutocomplete(entry.key).map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>
              </FormField>
            </div>

            {/* Value Input */}
            <div className="col-span-3">
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

            {/* Description Input */}
            <div className="col-span-5">
              <FormField
                label={index === 0 ? "Description" : ""}
                error={entry.descriptionError}
              >
                <Input
                  value={entry.description}
                  onChange={(e) => updateEntry(index, 'description', e.target.value)}
                  placeholder="Description de la propriété..."
                  disabled={disabled}
                />
              </FormField>
            </div>

            {/* Remove Button */}
            <div className={`col-span-1 ${index === 0 ? "pt-6" : "pt-1"}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeEntry(index)}
                disabled={disabled || propertyEntries.length === 1}
                className="text-red-600 hover:bg-red-50 border-red-200 w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
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

      {/* Info */}
      <div className="text-sm text-neutral-500">
        <p>💡 <strong>Astuce :</strong> Tapez pour voir les suggestions automatiques basées sur vos propriétés existantes.</p>
      </div>

      {/* Create Property Modal */}
      <CreatePropertyModal
        isOpen={showCreatePropertyModal}
        onClose={() => {
          setShowCreatePropertyModal(false)
          setNewPropertyKey('')
        }}
        onSubmit={handleCreateProperty}
        loading={createPropertyLoading}
      />
    </div>
  )
}

export { EventPropertiesInput }