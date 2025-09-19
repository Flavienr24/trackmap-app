import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { FormField } from '@/components/molecules/FormField'
import { EventPropertiesInput } from '@/components/organisms/EventPropertiesInput'
import { getStatusLabel } from '@/utils/properties'
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
  pageId,
  productId,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateEventRequest & { test_date?: string }>({
    name: '',
    status: 'to_implement',
    properties: {},
    test_date: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})


  const handleInputChange = (field: keyof (CreateEventRequest & { test_date?: string }), value: string | EventStatus) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-set test_date to today when status changes to validated or error
      if (field === 'status' && (value === 'validated' || value === 'error') && !prev.test_date) {
        const today = new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        newData.test_date = today
      }
      
      return newData
    })
    
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
      const submitData: CreateEventRequest & { test_date?: string } = {
        name: formData.name.trim(),
        status: formData.status,
        properties: Object.keys(formData.properties || {}).length > 0 ? formData.properties : undefined,
        test_date: formData.test_date?.trim() || undefined
      }
      
      await onSubmit(submitData as CreateEventRequest)
      
      // Reset form
      setFormData({ name: '', status: 'to_implement', properties: {}, test_date: '' })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', status: 'to_implement', properties: {}, test_date: '' })
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
          error={errors.status || errors.test_date}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-neutral-600">Statut initial</label>
                <Badge 
                  status={formData.status || 'to_implement'}
                  showDropdownArrow={true}
                  onStatusChange={(newStatus) => handleInputChange('status', newStatus)}
                  disabled={loading}
                >
                  {getStatusLabel(formData.status || 'to_implement')}
                </Badge>
              </div>
            </div>
            
            {(formData.status === 'validated' || formData.status === 'error') && (
              <div className="flex-shrink-0">
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-neutral-600">Date de test</label>
                  <input
                    type="date"
                    value={formData.test_date || ''}
                    onChange={(e) => handleInputChange('test_date', e.target.value)}
                    className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={loading}
                    style={{ 
                      width: '160px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </FormField>

        <EventPropertiesInput
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