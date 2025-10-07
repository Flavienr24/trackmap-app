import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/molecules/FormField'
import { EventPropertiesInput } from '@/components/organisms/EventPropertiesInput'
import type { CreateEventRequest, EventStatus } from '@/types'

interface CreateEventModalProps {
  isOpen: boolean
  pageId?: string
  productId?: string
  onClose: () => void
  onSubmit: (data: CreateEventRequest) => Promise<void>
  loading?: boolean
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  pageId: _pageId,
  productId,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateEventRequest>({
    name: '',
    status: 'to_implement',
    properties: {}
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
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handlePropertiesChange = (properties: Record<string, any>) => {
    setFormData(prev => ({ ...prev, properties }))
    // Clear properties error
    if (errors.properties) {
      const newErrors = { ...errors }
      delete newErrors.properties
      setErrors(newErrors)
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
        properties: Object.keys(formData.properties || {}).length > 0 ? formData.properties : undefined
      })
      
      // Reset form
      setFormData({ name: '', status: 'to_implement', properties: {} })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', status: 'to_implement', properties: {} })
    setErrors({})
    onClose()
  }

  // Suggest common event names
  const suggestedEvents = [
    'page_view',
    'select_content',
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
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: page_view, button_click, purchase"
            className="font-mono"
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
          <Badge
            status={formData.status || 'to_implement'}
            showDropdownArrow={true}
            onStatusChange={(newStatus) => handleInputChange('status', newStatus)}
            disabled={loading}
          >
            {eventStatuses.find(s => s.value === formData.status)?.label || 'À implémenter'}
          </Badge>
        </FormField>

        <EventPropertiesInput
          key={isOpen ? 'open' : 'closed'}
          productId={productId || ''}
          value={formData.properties || {}}
          onChange={handlePropertiesChange}
          disabled={loading}
          error={errors.properties}
        />
      </form>
    </Modal>
  )
}

export { CreateEventModal }