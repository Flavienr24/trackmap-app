import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { FormField } from '@/components/molecules/FormField'
import { EventPropertiesInput, type EventPropertiesInputRef } from '@/components/organisms/EventPropertiesInput'
import { parseProperties } from '@/utils/properties'
import type { Event, UpdateEventRequest, EventStatus, Screenshot } from '@/types'

interface EditEventModalProps {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateEventRequest) => Promise<void>
  onDelete?: (event: Event) => Promise<void>
  loading?: boolean
  productId?: string
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onSubmit,
  onDelete,
  loading = false,
  productId
}) => {
  const [formData, setFormData] = useState<UpdateEventRequest & { screenshots: Screenshot[] }>({
    name: '',
    status: 'to_implement',
    properties: {},
    test_date: '',
    screenshots: []
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const propertiesInputRef = useRef<EventPropertiesInputRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const eventStatuses: { value: EventStatus; label: string }[] = [
    { value: 'to_implement', label: 'À implémenter' },
    { value: 'to_test', label: 'À tester' },
    { value: 'validated', label: 'Validé' },
    { value: 'error', label: 'Erreur' },
  ]

  // Initialize form when event changes
  useEffect(() => {
    if (event) {
      const parsedProperties = parseProperties(event.properties)
      
      setFormData({
        name: event.name,
        status: event.status,
        properties: parsedProperties,
        test_date: event.test_date || '',
        screenshots: event.screenshots || []
      })
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

  const handlePropertiesChange = (properties: Record<string, any>) => {
    setFormData(prev => ({ ...prev, properties }))
    // Clear properties error
    if (errors.properties) {
      const newErrors = { ...errors }
      delete newErrors.properties
      setErrors(newErrors)
    }
  }

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!event || files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch(`/api/events/${event.id}/screenshots`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error('Upload failed')
        }
        
        const result = await response.json()
        return result.data.screenshot
      })

      const newScreenshots = await Promise.all(uploadPromises)
      
      setFormData(prev => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), ...newScreenshots]
      }))
    } catch (error) {
      console.error('Error uploading screenshots:', error)
      alert('Erreur lors de l\'upload des images')
    } finally {
      setUploading(false)
    }
  }

  // Handle screenshot deletion
  const handleDeleteScreenshot = async (screenshotToDelete: Screenshot) => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}/screenshots/${screenshotToDelete.public_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      setFormData(prev => ({
        ...prev,
        screenshots: prev.screenshots?.filter(s => s.public_id !== screenshotToDelete.public_id) || []
      }))

      // Close preview if deleted screenshot was selected
      if (selectedScreenshot?.public_id === screenshotToDelete.public_id) {
        setSelectedScreenshot(null)
      }
    } catch (error) {
      console.error('Error deleting screenshot:', error)
      alert('Erreur lors de la suppression de l\'image')
    }
  }

  // Handle add screenshot button click
  const handleAddScreenshotClick = () => {
    fileInputRef.current?.click()
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom de l\'event est requis'
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
    
    // Validate properties before submitting
    if (!propertiesInputRef.current?.validateAllEntries()) {
      return // Stop submission if properties validation fails
    }
    
    try {
      await onSubmit(event.id, {
        name: formData.name?.trim(),
        status: formData.status,
        properties: formData.properties && Object.keys(formData.properties).length > 0 ? formData.properties : {},
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

  const handleDelete = async () => {
    if (!event || !onDelete) return
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'event "${event.name}" ?`)) {
      try {
        await onDelete(event)
        onClose()
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
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
    <div className="flex justify-between">
      {onDelete && (
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading}
        >
          Supprimer l'event
        </Button>
      )}
      <div className="flex space-x-3 ml-auto">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Sauvegarder
        </Button>
      </div>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Modifier "${event.name}"`}
      footer={footer}
      size="2xl"
      fixedHeight={true}
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

        {/* Screenshots Section */}
        <FormField
          label="Screenshots"
          hint="Ajoutez des images pour documenter cet événement"
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            disabled={loading || uploading}
          />

          <div className="space-y-4">
            {/* Selected screenshot preview */}
            {selectedScreenshot && (
              <div className="bg-white border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-neutral-600">Aperçu</h4>
                  <button
                    type="button"
                    onClick={() => setSelectedScreenshot(null)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                    title="Fermer l'aperçu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 flex justify-center">
                  <img
                    src={selectedScreenshot.secure_url}
                    alt="Screenshot preview"
                    className="max-w-full max-h-64 object-contain rounded border border-neutral-200"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3 text-xs text-neutral-500 space-y-1">
                  <div>Format: {selectedScreenshot.format.toUpperCase()}</div>
                  <div>Dimensions: {selectedScreenshot.width} × {selectedScreenshot.height} px</div>
                  <div>Taille: {Math.round(selectedScreenshot.bytes / 1024)} KB</div>
                </div>
              </div>
            )}

            {/* Upload zone - full width */}
            <button
              type="button"
              onClick={handleAddScreenshotClick}
              disabled={loading || uploading}
              className="w-full h-24 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:border-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Ajouter des screenshots"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-500"></div>
              ) : (
                <>
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">Cliquez pour ajouter des screenshots</span>
                </>
              )}
            </button>

            {/* Existing screenshots grid */}
            {formData.screenshots && formData.screenshots.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {formData.screenshots.map((screenshot, index) => (
                  <div key={screenshot.public_id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedScreenshot(screenshot)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 w-full ${
                        selectedScreenshot?.public_id === screenshot.public_id
                          ? 'border-blue-500 shadow-md'
                          : 'border-neutral-200'
                      }`}
                      title={`Voir le screenshot ${index + 1}`}
                    >
                      <img
                        src={screenshot.thumbnail_url || screenshot.secure_url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </button>
                    
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteScreenshot(screenshot)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Supprimer cette image"
                      disabled={loading}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload info */}
            {formData.screenshots && formData.screenshots.length > 0 && (
              <p className="text-xs text-neutral-500">
                {formData.screenshots.length} screenshot{formData.screenshots.length > 1 ? 's' : ''} ajouté{formData.screenshots.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
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

        <EventPropertiesInput
          ref={propertiesInputRef}
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

export { EditEventModal }