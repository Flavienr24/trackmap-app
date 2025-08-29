import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { FormField } from '@/components/molecules/FormField'
import { parseVariables } from '@/utils/variables'
import type { Event, UpdateEventRequest, EventStatus } from '@/types'

interface EditEventModalProps {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateEventRequest) => Promise<void>
  loading?: boolean
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<UpdateEventRequest>({
    name: '',
    status: 'to_implement',
    variables: {},
    test_date: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [variablesJson, setVariablesJson] = useState('{}')

  const eventStatuses: { value: EventStatus; label: string }[] = [
    { value: 'to_implement', label: 'À implémenter' },
    { value: 'to_test', label: 'À tester' },
    { value: 'validated', label: 'Validé' },
    { value: 'error', label: 'Erreur' },
  ]

  // Initialize form when event changes
  useEffect(() => {
    if (event) {
      const parsedVariables = parseVariables(event.variables)
      
      setFormData({
        name: event.name,
        status: event.status,
        variables: parsedVariables,
        test_date: event.test_date || ''
      })
      setVariablesJson(JSON.stringify(parsedVariables, null, 2))
    }
  }, [event])

  const handleInputChange = (field: keyof UpdateEventRequest, value: string | EventStatus) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleVariablesChange = (value: string) => {
    setVariablesJson(value)
    
    try {
      const parsed = JSON.parse(value || '{}')
      setFormData(prev => ({ ...prev, variables: parsed }))
      // Clear variables error if JSON is valid
      if (errors.variables) {
        const newErrors = { ...errors }
        delete newErrors.variables
        setErrors(newErrors)
      }
    } catch (error) {
      // Don't update variables if JSON is invalid, but don't show error yet
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom de l\'event est requis'
    }
    
    // Validate JSON
    try {
      JSON.parse(variablesJson || '{}')
    } catch (error) {
      newErrors.variables = 'Format JSON invalide'
    }

    // Validate test_date if provided
    if (formData.test_date && formData.test_date.trim()) {
      const date = new Date(formData.test_date.trim())
      if (isNaN(date.getTime())) {
        newErrors.test_date = 'Format de date invalide'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!event || !validateForm()) return
    
    try {
      const variables = JSON.parse(variablesJson || '{}')
      
      await onSubmit(event.id, {
        name: formData.name?.trim(),
        status: formData.status,
        variables: Object.keys(variables).length > 0 ? variables : {},
        test_date: formData.test_date?.trim() || undefined
      })
      
      onClose()
    } catch (error) {
      console.error('Error updating event:', error)
    }
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  if (!event) return null

  // Suggest common event names
  const suggestedEvents = [
    'page_view',
    'button_click',
    'form_submit',
    'purchase',
    'add_to_cart',
    'login',
    'sign_up',
    'video_play',
    'download',
    'search'
  ]

  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} loading={loading}>
        Sauvegarder
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Modifier "${event.name}"`}
      footer={footer}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nom de l'event"
          required
          error={errors.name}
          hint="Nom de l'événement GA4 (ex: page_view, button_click)"
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: page_view, button_click, purchase"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
            list="event-suggestions"
          />
          <datalist id="event-suggestions">
            {suggestedEvents.map(event => (
              <option key={event} value={event} />
            ))}
          </datalist>
        </FormField>

        <FormField
          label="Statut"
          error={errors.status}
        >
          <div className="flex flex-wrap gap-2">
            {eventStatuses.map(status => (
              <label key={status.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  checked={formData.status === status.value}
                  onChange={(e) => handleInputChange('status', e.target.value as EventStatus)}
                  className="sr-only"
                  disabled={loading}
                />
                <div className={`px-3 py-2 rounded-md border transition-colors ${
                  formData.status === status.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}>
                  <Badge status={status.value}>{status.label}</Badge>
                </div>
              </label>
            ))}
          </div>
        </FormField>

        <FormField
          label="Date de test"
          error={errors.test_date}
          hint="Date optionnelle de test de l'événement (format: YYYY-MM-DD)"
        >
          <input
            type="date"
            value={formData.test_date || ''}
            onChange={(e) => handleInputChange('test_date', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Variables (JSON)"
          error={errors.variables}
          hint="Variables de l'événement au format JSON. Laisser vide pour aucune variable."
        >
          <textarea
            value={variablesJson}
            onChange={(e) => handleVariablesChange(e.target.value)}
            placeholder={`{
  "page_name": "homepage",
  "page_category": "landing",
  "user_id": "$user-id"
}`}
            rows={6}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            disabled={loading}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export { EditEventModal }