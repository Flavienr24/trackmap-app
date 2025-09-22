import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { FormField } from '@/components/molecules/FormField'
import { EventPropertiesInput, type EventPropertiesInputRef } from '@/components/organisms/EventPropertiesInput'
import { DragDropZone, type FileWithProgress } from '@/components/molecules/DragDropZone'
import { ScreenshotThumbnail } from '@/components/molecules/ScreenshotThumbnail'
import { parseProperties, getStatusLabel } from '@/utils/properties'
import { uploadMultipleFilesWithProgress } from '@/utils/uploadUtils'
import { deleteScreenshot } from '@/utils/screenshotUtils'
import { pagesApi, eventsApi } from '@/services/api'
import type { Event, UpdateEventRequest, EventStatus, Screenshot } from '@/types'

interface EditEventModalProps {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateEventRequest) => Promise<void>
  onDelete?: (event: Event) => Promise<void>
  loading?: boolean
  productId?: string
  onSaveSuccess?: (event: Event) => void
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onSubmit,
  onDelete,
  loading = false,
  productId,
  onSaveSuccess
}) => {
  const [formData, setFormData] = useState<UpdateEventRequest & { screenshots: Screenshot[] }>({
    name: '',
    status: 'to_implement',
    properties: {},
    test_date: '',
    screenshots: []
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [existingEvents, setExistingEvents] = useState<Event[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<Event[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const propertiesInputRef = useRef<EventPropertiesInputRef>(null)


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

  // Load all existing events for the product
  useEffect(() => {
    const loadExistingEvents = async () => {
      if (!productId || !isOpen) return

      try {
        // First get all pages of the product
        const pagesResponse = await pagesApi.getByProduct(productId)
        const pages = pagesResponse.data

        // Then get all events from all pages
        const allEventsPromises = pages.map(page => eventsApi.getByPage(page.id))
        const eventsResponses = await Promise.all(allEventsPromises)
        
        // Flatten all events and exclude the current event being edited
        const allEvents = eventsResponses
          .flatMap(response => response.data)
          .filter(existingEvent => existingEvent.id !== event?.id) // Exclude current event
        
        setExistingEvents(allEvents)
      } catch (error) {
        console.error('Error loading existing events:', error)
      }
    }

    loadExistingEvents()
  }, [productId, isOpen, event?.id])

  const handleInputChange = (field: keyof UpdateEventRequest, value: string | EventStatus) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-set test_date to today when status changes to validated or error
      if (field === 'status' && (value === 'validated' || value === 'error') && !prev.test_date) {
        const today = new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        newData.test_date = today
      }
      
      return newData
    })
    
    // Handle event name suggestions
    if (field === 'name' && typeof value === 'string') {
      const inputValue = value.trim().toLowerCase()
      
      if (inputValue.length > 0) {
        // Filter existing events that match the input
        const matches = existingEvents.filter(existingEvent => 
          existingEvent.name.toLowerCase().includes(inputValue) &&
          existingEvent.name.toLowerCase() !== inputValue // Don't suggest exact matches
        )
        
        if (matches.length > 0) {
          setFilteredSuggestions(matches)
          setShowSuggestions(true)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
      }
    }
    
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

  // Handle suggestion selection
  const handleSuggestionSelect = (eventName: string) => {
    setFormData(prev => ({ ...prev, name: eventName }))
    setShowSuggestions(false)
    
    // Clear name error if any
    if (errors.name) {
      const newErrors = { ...errors }
      delete newErrors.name
      setErrors(newErrors)
    }
  }

  // Close suggestions when clicking outside
  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 150)
  }

  // Handle files selection from drag drop
  const handleFilesSelected = (_files: File[]) => {
    // Files will be uploaded via the DragDropZone onUpload callback
  }

  // Handle upload with progress tracking
  const handleUploadWithProgress = async (
    filesWithProgress: FileWithProgress[], 
    setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void
  ): Promise<any[]> => {
    if (!event) return []

    try {
      const results = await uploadMultipleFilesWithProgress(event.id, filesWithProgress, setProgress)
      
      // Extract screenshots from successful results
      const newScreenshots: Screenshot[] = results
        .filter(result => result.success && result.data?.screenshots)
        .flatMap(result => result.data.screenshots)
      
      // Update form data with new screenshots
      if (newScreenshots.length > 0) {
        setFormData(prev => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), ...newScreenshots]
        }))
      }
      
      return results
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    }
  }


  // Handle screenshot deletion
  const handleDeleteScreenshot = async (screenshotToDelete: Screenshot) => {
    if (!event) return

    try {
      await deleteScreenshot(event.id, screenshotToDelete)

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
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'image'
      alert(errorMessage)
    }
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
      
      // If onSaveSuccess callback is provided, call it with the updated event
      if (onSaveSuccess) {
        const updatedEvent: Event = {
          ...event,
          name: formData.name?.trim() || event.name,
          status: formData.status || event.status,
          properties: formData.properties && Object.keys(formData.properties).length > 0 ? formData.properties : {},
          test_date: formData.test_date?.trim() || event.test_date,
          screenshots: formData.screenshots
        }
        onSaveSuccess(updatedEvent)
      }
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
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={handleInputBlur}
              placeholder="Nom de l'événement GA4"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              disabled={loading}
            />
            
            {/* Custom suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="py-1">
                  <div className="px-3 py-2 text-xs font-medium text-neutral-500 bg-neutral-50 border-b border-neutral-100">
                    Events existants dans ce produit
                  </div>
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer flex items-center justify-between"
                      onClick={() => handleSuggestionSelect(suggestion.name)}
                    >
                      <span className="font-mono text-neutral-900">{suggestion.name}</span>
                      <span className="text-xs text-neutral-400 truncate ml-2">
                        {/* Find page name - we'll need to enhance this later */}
                        ID: {suggestion.id.slice(-6)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormField>

        <FormField
          error={errors.status || errors.test_date}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-neutral-600">Statut</label>
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
            
            {(() => {
              // More robust check: test both formData and event status (case-insensitive)
              const formStatus = formData.status?.toLowerCase();
              const eventStatus = event?.status?.toLowerCase();
              const shouldShow = 
                formStatus === 'validated' || formStatus === 'error' ||
                eventStatus === 'validated' || eventStatus === 'error';
              
              return shouldShow;
            })() && (
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
          ref={propertiesInputRef}
          productId={productId || ''}
          value={formData.properties || {}}
          onChange={handlePropertiesChange}
          disabled={loading}
          error={errors.properties}
        />

        {/* Screenshots Section */}
        <FormField
          label="Screenshots"
          hint="Glissez-déposez vos images et PDF ou cliquez pour sélectionner"
        >
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

            {/* Drag & Drop Upload Zone */}
            <DragDropZone
              onFilesSelected={handleFilesSelected}
              onUpload={handleUploadWithProgress}
              accept="image/*,.pdf"
              maxFiles={10}
              maxSize={5 * 1024 * 1024}
              disabled={loading}
              className="p-8"
              multiple={true}
              showProgress={true}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <svg className="w-12 h-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-lg font-medium text-neutral-700 mb-2">
                  Glissez vos fichiers ici
                </div>
                <div className="text-sm text-neutral-500 mb-4">
                  ou cliquez pour parcourir
                </div>
                <div className="text-xs text-neutral-400">
                  Images (JPEG, PNG, GIF, WebP) et PDF acceptés • Max 5MB • 10 fichiers max
                </div>
              </div>
            </DragDropZone>

            {/* Existing screenshots grid */}
            {formData.screenshots && formData.screenshots.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-neutral-600 mb-3">
                  Fichiers ajoutés ({formData.screenshots.length})
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {formData.screenshots.map((screenshot, index) => (
                    <ScreenshotThumbnail
                      key={screenshot.public_id}
                      screenshot={screenshot}
                      index={index}
                      isSelected={selectedScreenshot?.public_id === screenshot.public_id}
                      onClick={setSelectedScreenshot}
                      onDelete={handleDeleteScreenshot}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormField>
      </form>
    </Modal>
  )
}

export { EditEventModal }