import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/molecules/FormField'
import { EventPropertiesInput } from '@/components/organisms/EventPropertiesInput'
import { type FileWithProgress } from '@/components/molecules/DragDropZone'
import { EventCombobox, type EventOption } from '@/components/ui/event-combobox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BulkEventImporter } from '@/components/organisms/BulkEventImporter'
import { uploadMultipleFilesWithProgress } from '@/utils/uploadUtils'
import { useImportContext } from '@/hooks/useImportContext'
import type { CreateEventRequest, EventStatus } from '@/types'
import type { ParsedImportData } from '@/types/importContext'

interface CreateEventModalProps {
  isOpen: boolean
  pageId?: string
  productId?: string
  onClose: () => void
  onSubmit: (data: CreateEventRequest) => Promise<any>
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [eventOptions, setEventOptions] = useState<EventOption[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual')

  // Fetch import context using consolidated endpoint
  // Lazy loading: only fetch when bulk import tab is active to avoid performance hit
  const { data: importContext } = useImportContext(productId, {
    enabled: isOpen && activeTab === 'bulk'
  })

  // Build event options from import context + common suggestions
  useEffect(() => {
    if (!importContext) return

    const commonEvents = [
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

    // Combine existing event names from context + common suggestions
    const allEventNames = new Set([...importContext.eventNames, ...commonEvents])

    const options: EventOption[] = Array.from(allEventNames).map(name => ({
      value: name
    }))

    setEventOptions(options)
  }, [importContext])

  // Compute hasManualData dynamically to avoid false confirmations
  const hasManualData = !!(
    formData.name.trim() ||
    Object.keys(formData.properties || {}).length > 0 ||
    pendingFiles.length > 0
  )

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

  // Handle tab switching with confirmation if manual data exists
  const handleTabChange = (newTab: 'manual' | 'bulk') => {
    if (activeTab === 'manual' && hasManualData && newTab === 'bulk') {
      const confirmed = window.confirm(
        'Vous avez des données en cours dans le formulaire manuel. En passant à l\'import en masse, vous pourrez revenir mais vos données seront conservées. Continuer ?'
      )
      if (!confirmed) return
    }
    setActiveTab(newTab)
  }

  // Handle bulk import validation - pre-fill manual form
  const handleBulkImportValidated = (data: ParsedImportData) => {
    setFormData({
      name: data.eventName,
      status: 'to_implement',
      properties: data.properties
    })
    setActiveTab('manual')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'event est requis'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle files selection from drag drop (store temporarily)
  const handleFilesSelected = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files])
  }

  // Remove pending file
  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle upload with progress tracking (called after event creation)
  const handleUploadWithProgress = async (
    eventId: string,
    filesWithProgress: FileWithProgress[],
    setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void
  ): Promise<any[]> => {
    try {
      const results = await uploadMultipleFilesWithProgress(eventId, filesWithProgress, setProgress)
      return results
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      // First, create the event
      const createdEvent = await onSubmit({
        name: formData.name.trim(),
        status: formData.status,
        properties: Object.keys(formData.properties || {}).length > 0 ? formData.properties : undefined
      })

      // If files are pending and event was created, upload them
      if (pendingFiles.length > 0 && createdEvent?.id) {
        const filesWithProgress: FileWithProgress[] = pendingFiles.map(file => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: 'uploading' as const
        }))

        // Upload files (errors are handled internally)
        await handleUploadWithProgress(
          createdEvent.id,
          filesWithProgress,
          () => {} // Progress callback not needed here
        )
      }

      // Reset form
      setFormData({ name: '', status: 'to_implement', properties: {} })
      setPendingFiles([])
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', status: 'to_implement', properties: {} })
    setPendingFiles([])
    setErrors({})
    setActiveTab('manual')
    onClose()
  }


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
      size="custom"
      fixedHeight
      contentClassName="w-[750px] max-w-[95vw]"
    >
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'manual' | 'bulk')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
          <TabsTrigger value="bulk">Import en masse</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Nom de l'event"
              required
              error={errors.name}
              hint="Nom de l'événement GA4 (ex: page_view, button_click)"
            >
              <EventCombobox
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                options={eventOptions}
                placeholder="Sélectionner ou saisir un event..."
                emptyMessage="Aucun event trouvé."
                disabled={loading}
              />
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

            {/* Screenshots Section */}
            <FormField
              label="Screenshots (optionnel)"
              hint="Ajoutez des captures d'écran ou fichiers. Ils seront uploadés après la création de l'event."
            >
              <div className="space-y-4">
                {/* Simple file input */}
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(Array.from(e.target.files))
                      }
                    }}
                    className="hidden"
                    disabled={loading}
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-sm font-medium text-neutral-700 mb-1">
                        Cliquez pour sélectionner des fichiers
                      </div>
                      <div className="text-xs text-neutral-500">
                        Images (JPEG, PNG, GIF, WebP) • Max 5MB
                      </div>
                    </div>
                  </label>
                </div>

                {/* Pending files list */}
                {pendingFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-600 mb-3">
                      Fichiers sélectionnés ({pendingFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                        >
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{file.name}</div>
                              <div className="text-xs text-neutral-500">{Math.round(file.size / 1024)} KB</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile(index)}
                            className="text-neutral-400 hover:text-red-600 transition-colors"
                            title="Retirer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormField>
          </form>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkEventImporter
            productId={productId || ''}
            onValidated={handleBulkImportValidated}
            onCancel={() => setActiveTab('manual')}
          />
        </TabsContent>
      </Tabs>
    </Modal>
  )
}

export { CreateEventModal }
