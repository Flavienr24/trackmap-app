import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { eventDefinitionsApi, pagesApi, commonPropertiesApi } from '@/services/api'
import type {
  CreateEventRequest,
  EventStatus,
  EventDefinition,
  Page,
  UserInteractionType
} from '@/types'
import type { ParsedImportData } from '@/types/importContext'

interface CreateEventModalProps {
  isOpen: boolean
  pageId?: string
  productId?: string
  onClose: () => void
  onSubmit: (payload: { pageId: string; data: CreateEventRequest }) => Promise<any>
  loading?: boolean
}

const interactionOptions: Array<{ value: UserInteractionType; label: string }> = [
  { value: 'click', label: 'Clic' },
  { value: 'page_load', label: 'Chargement de page' },
  { value: 'form_submit', label: 'Soumission de formulaire' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'interaction', label: 'Autre interaction' },
  { value: 'other', label: 'Autre' },
]

const DEFAULT_EVENT_REQUEST: CreateEventRequest = {
  name: '',
  status: 'to_implement',
  properties: {},
  description: '',
  userInteractionType: 'interaction'
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  pageId,
  productId,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateEventRequest>({ ...DEFAULT_EVENT_REQUEST })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [eventOptions, setEventOptions] = useState<EventOption[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual')
  const [existingDefinitions, setExistingDefinitions] = useState<EventDefinition[]>([])
  const [selectedDefinition, setSelectedDefinition] = useState<EventDefinition | null>(null)
  const [definitionsLoading, setDefinitionsLoading] = useState(false)
  const [availablePages, setAvailablePages] = useState<Page[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState<string>(pageId ?? '')
  const [commonPropsLoaded, setCommonPropsLoaded] = useState(false)

  // Fetch import context lazily for bulk creation suggestions
  const { data: importContext } = useImportContext(productId, {
    enabled: isOpen && activeTab === 'bulk'
  })

  const eventStatuses: { value: EventStatus; label: string }[] = [
    { value: 'to_implement', label: 'À implémenter' },
    { value: 'to_test', label: 'À tester' },
    { value: 'validated', label: 'Validé' },
    { value: 'error', label: 'Erreur' },
  ]

  const hasManualData = useMemo(() => {
    return Boolean(
      formData.name.trim() ||
      Object.keys(formData.properties || {}).length > 0 ||
      (formData.description && formData.description.trim().length > 0) ||
      pendingFiles.length > 0
    )
  }, [formData, pendingFiles])

  const resetState = useCallback(() => {
    setFormData({ ...DEFAULT_EVENT_REQUEST })
    setPendingFiles([])
    setErrors({})
    setActiveTab('manual')
    setSelectedDefinition(null)
    setSelectedPageId(pageId ?? '')
    setCommonPropsLoaded(false)
  }, [pageId])

  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  // Fetch existing event definitions when modal opens
  useEffect(() => {
    if (!isOpen || !productId) return

    const fetchDefinitions = async () => {
      setDefinitionsLoading(true)
      try {
        const response = await eventDefinitionsApi.getByProduct(productId)
        setExistingDefinitions(response.data)
      } catch (error) {
        console.error('Error loading event definitions:', error)
      } finally {
        setDefinitionsLoading(false)
      }
    }

    fetchDefinitions()
  }, [isOpen, productId])

  // Fetch pages when no fixed page is provided
  useEffect(() => {
    if (!isOpen || pageId || !productId) return

    const fetchPages = async () => {
      setPagesLoading(true)
      try {
        const response = await pagesApi.getByProduct(productId)
        setAvailablePages(response.data)
      } catch (error) {
        console.error('Error loading pages:', error)
      } finally {
        setPagesLoading(false)
      }
    }

    fetchPages()
  }, [isOpen, pageId, productId])

  // Ensure selected page stays in sync with prop or reset when modal reopens
  useEffect(() => {
    if (!isOpen) return
    setSelectedPageId(pageId ?? '')
  }, [isOpen, pageId])

  // Load and pre-fill common properties when modal opens
  useEffect(() => {
    if (!isOpen || !productId || commonPropsLoaded) return

    const loadCommonProperties = async () => {
      try {
        const response = await commonPropertiesApi.getByProduct(productId)
        const commonProperties = response.data

        if (commonProperties.length > 0) {
          // Build properties object from common properties
          const defaultProperties: Record<string, any> = {}
          commonProperties.forEach((cp) => {
            if (cp.property && cp.suggestedValue) {
              defaultProperties[cp.property.name] = cp.suggestedValue.value
            }
          })

          // Pre-fill form data with common properties
          setFormData((prev) => ({
            ...prev,
            properties: {
              ...defaultProperties,
              ...prev.properties // Keep any manually entered properties
            }
          }))

          console.log(`✓ ${commonProperties.length} propriété(s) commune(s) pré-remplie(s)`)
        }

        setCommonPropsLoaded(true)
      } catch (error) {
        console.error('Error loading common properties:', error)
        setCommonPropsLoaded(true) // Mark as loaded even on error to avoid retry loop
      }
    }

    loadCommonProperties()
  }, [isOpen, productId, commonPropsLoaded])

  // Build combobox suggestions from import context + existing definitions + common events
  useEffect(() => {
    if (!isOpen) return

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

    const definitionNames = existingDefinitions.map(def => def.name)
    const importNames = importContext?.eventNames ?? []
    const allEventNames = new Set([...definitionNames, ...importNames, ...commonEvents])

    const options: EventOption[] = Array.from(allEventNames).map(name => ({
      value: name
    }))

    setEventOptions(options)
  }, [isOpen, existingDefinitions, importContext])

  // Detect if event corresponds to an existing definition
  useEffect(() => {
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      if (selectedDefinition) {
        setSelectedDefinition(null)
        setFormData(prev => ({
          ...prev,
          description: '',
          userInteractionType: prev.userInteractionType ?? 'interaction'
        }))
      }
      return
    }

    const match = existingDefinitions.find(def => def.name.toLowerCase() === trimmedName.toLowerCase())
    if (match) {
      if (!selectedDefinition || selectedDefinition.id !== match.id) {
        setSelectedDefinition(match)
        setFormData(prev => ({
          ...prev,
          description: match.description,
          userInteractionType: match.userInteractionType as UserInteractionType
        }))
      }
    } else if (selectedDefinition) {
      setSelectedDefinition(null)
      setFormData(prev => ({
        ...prev,
        description: '',
        userInteractionType: prev.userInteractionType ?? 'interaction'
      }))
    }
  }, [formData.name, existingDefinitions, selectedDefinition])

  const handleInputChange = (field: keyof CreateEventRequest, value: string | EventStatus | UserInteractionType) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handlePropertiesChange = (properties: Record<string, any>) => {
    setFormData(prev => ({ ...prev, properties }))
    if (errors.properties) {
      const newErrors = { ...errors }
      delete newErrors.properties
      setErrors(newErrors)
    }
  }

  const handleTabChange = (newTab: 'manual' | 'bulk') => {
    if (activeTab === 'manual' && newTab === 'bulk' && hasManualData) {
      const confirmed = window.confirm(
        'Vous avez des données en cours dans le formulaire manuel. En passant à l\'import en masse, vos données seront conservées. Continuer ?'
      )
      if (!confirmed) return
    }
    setActiveTab(newTab)
  }

  const handleBulkImportValidated = (data: ParsedImportData) => {
    setFormData({
      ...DEFAULT_EVENT_REQUEST,
      name: data.eventName,
      properties: data.properties
    })
    setActiveTab('manual')
  }

  const handleFilesSelected = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files])
  }

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadWithProgress = async (
    eventId: string,
    filesWithProgress: FileWithProgress[],
    setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void
  ): Promise<any[]> => {
    const results = await uploadMultipleFilesWithProgress(eventId, filesWithProgress, setProgress)
    return results
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'event est requis'
    }

    if (!pageId && !selectedPageId) {
      newErrors.pageId = 'Sélectionnez la page sur laquelle implémenter l\'event'
    }

    if (!selectedDefinition) {
      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'Ajoutez une description pour cette nouvelle définition'
      }
      if (!formData.userInteractionType) {
        newErrors.userInteractionType = 'Sélectionnez un type d\'interaction'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const targetPageId = pageId ?? selectedPageId
    if (!targetPageId) return

    const payload: CreateEventRequest = {
      name: formData.name.trim(),
      status: formData.status,
      properties: Object.keys(formData.properties || {}).length > 0 ? formData.properties : undefined,
    }

    if (!selectedDefinition) {
      payload.description = formData.description?.trim() || ''
      payload.userInteractionType = formData.userInteractionType || 'interaction'
    }

    try {
      const createdEvent = await onSubmit({
        pageId: targetPageId,
        data: payload
      })

      if (pendingFiles.length > 0 && createdEvent?.id) {
        const filesWithProgress: FileWithProgress[] = pendingFiles.map(file => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: 'uploading'
        }))

        await handleUploadWithProgress(createdEvent.id, filesWithProgress, () => {})
      }

      resetState()
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} loading={loading}>
        Créer l&apos;event
      </Button>
    </div>
  )

  const manualForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!pageId && (
        <FormField
          label="Page cible"
          required
          error={errors.pageId}
          hint={pagesLoading ? 'Chargement des pages…' : 'Choisissez la page sur laquelle implémenter cet événement'}
        >
          <Select
            disabled={pagesLoading || loading || availablePages.length === 0}
            value={selectedPageId}
            onValueChange={(value) => {
              setSelectedPageId(value)
              if (errors.pageId) {
                const newErrors = { ...errors }
                delete newErrors.pageId
                setErrors(newErrors)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={pagesLoading ? 'Chargement…' : availablePages.length === 0 ? 'Aucune page disponible' : 'Sélectionner une page'} />
            </SelectTrigger>
            <SelectContent>
              {availablePages.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Aucune page disponible
                </div>
              ) : (
                availablePages.map(page => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </FormField>
      )}

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
          disabled={loading || definitionsLoading}
        />
      </FormField>

      {selectedDefinition ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Cet événement fait déjà partie du glossaire. La définition existante sera réutilisée.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nouvel événement : la définition sera créée automatiquement avec les informations ci-dessous.
        </div>
      )}

      {!selectedDefinition ? (
        <FormField
          label="Description"
          required
          error={errors.description}
          hint="Decrivez l'objectif de cet evenement pour le glossaire (ex: Suivre les clics sur le CTA principal)."
        >
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Decrivez l'objectif de cet evenement"
            disabled={loading}
          />
        </FormField>
      ) : (
        <FormField label="Description">
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {selectedDefinition.description || 'Description non définie'}
          </div>
        </FormField>
      )}

      <FormField label="Type d'interaction" error={errors.userInteractionType}>
        {selectedDefinition ? (
          <Badge variant="secondary" className="capitalize">
            {interactionOptions.find(opt => opt.value === selectedDefinition.userInteractionType)?.label ||
              selectedDefinition.userInteractionType}
          </Badge>
        ) : (
          <Select
            value={formData.userInteractionType || 'interaction'}
            onValueChange={(value: UserInteractionType) => handleInputChange('userInteractionType', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type d'interaction" />
            </SelectTrigger>
            <SelectContent>
              {interactionOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="Statut initial">
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

      <FormField
        label="Screenshots (optionnel)"
        hint="Ajoutez des captures d'écran ou fichiers. Ils seront uploadés après la création de l'event."
      >
        <div className="space-y-4">
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
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajouter un nouvel event"
      footer={footer}
      size="custom"
      fixedHeight
      contentClassName="w-[780px] max-w-[95vw]"
    >
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'manual' | 'bulk')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
          <TabsTrigger value="bulk">Import en masse</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          {manualForm}
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
