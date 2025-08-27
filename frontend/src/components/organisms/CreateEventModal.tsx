import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { FormField } from '@/components/molecules/FormField'
import { EventVariablesInput } from '@/components/organisms/EventVariablesInput'
import type { CreateEventRequest, EventStatus } from '@/types'

interface CreateEventModalProps {
  isOpen: boolean
  productId: string
  onClose: () => void
  onSubmit: (data: CreateEventRequest) => Promise<void>
  loading?: boolean
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  productId,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateEventRequest>({
    name: '',
    status: 'to_implement',
    variables: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const eventStatuses: { value: EventStatus; label: string }[] = [
    { value: 'to_implement', label: 'À implémenter' },
    { value: 'to_test', label: 'À tester' },
    { value: 'validated', label: 'Validé' },
    { value: 'error', label: 'Erreur' },
  ]

  const handleInputChange = (field: keyof CreateEventRequest, value: string | EventStatus) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleVariablesChange = (variables: Record<string, any>) => {
    setFormData(prev => ({ ...prev, variables }))
    // Clear variables error
    if (errors.variables) {
      setErrors(prev => ({ ...prev, variables: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'event est requis'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      await onSubmit({
        name: formData.name.trim(),
        status: formData.status,
        variables: Object.keys(formData.variables || {}).length > 0 ? formData.variables : undefined
      })
      
      // Reset form
      setFormData({ name: '', status: 'to_implement', variables: {} })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', status: 'to_implement', variables: {} })
    setErrors({})
    onClose()
  }

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
        Créer l'event
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Ajouter un nouvel event"
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
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
          label="Statut initial"
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
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}>
                  <Badge status={status.value} className="mr-2" />
                  {status.label}
                </div>
              </label>
            ))}
          </div>
        </FormField>

        <EventVariablesInput
          productId={productId}
          value={formData.variables || {}}
          onChange={handleVariablesChange}
          disabled={loading}
          error={errors.variables}
        />
      </form>
    </Modal>
  )
}

export { CreateEventModal }