import React, { useState, useRef, useCallback } from 'react'

export interface FileWithProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  id: string
  error?: string
  abortController?: AbortController
}

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void
  onUpload?: (files: FileWithProgress[], setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void) => Promise<any[]>
  accept?: string
  maxFiles?: number
  maxSize?: number // in bytes
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  multiple?: boolean
  showProgress?: boolean
  allowCancellation?: boolean
}

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesSelected,
  onUpload,
  accept = "image/*,.pdf",
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  disabled = false,
  className = "",
  children,
  multiple = true,
  showProgress = true,
  allowCancellation = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [filesWithProgress, setFilesWithProgress] = useState<FileWithProgress[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Cancel upload function
  const cancelUpload = (fileId: string) => {
    const file = filesWithProgress.find(f => f.id === fileId)
    if (file?.abortController) {
      file.abortController.abort()
      setFilesWithProgress(prev => prev.map(item => 
        item.id === fileId ? { ...item, status: 'error' as const, error: 'Cancelled by user' } : item
      ))
    }
  }

  // Cancel all uploads
  const cancelAllUploads = () => {
    filesWithProgress.forEach(file => {
      if (file.abortController && file.status === 'uploading') {
        file.abortController.abort()
      }
    })
    setFilesWithProgress(prev => prev.map(item => 
      item.status === 'uploading' ? { ...item, status: 'error' as const, error: 'Cancelled by user' } : item
    ))
    setIsUploading(false)
  }

  // Validate files
  const validateFiles = (files: FileList): { validFiles: File[], errors: string[] } => {
    const validFiles: File[] = []
    const errors: string[] = []
    
    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`)
      return { validFiles: [], errors }
    }

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`)
        return
      }

      // Check file type
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const isValidType = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
        }
        if (acceptedType.includes('/*')) {
          const baseType = acceptedType.split('/')[0]
          return file.type.startsWith(baseType)
        }
        return file.type === acceptedType
      })

      if (!isValidType) {
        errors.push(`${file.name}: Invalid file type`)
        return
      }

      validFiles.push(file)
    })

    return { validFiles, errors }
  }

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  // Handle files (from drag or input)
  const handleFiles = async (files: FileList) => {
    if (disabled || isUploading) return

    const { validFiles, errors } = validateFiles(files)
    
    if (errors.length > 0) {
      alert(`Upload errors:\n${errors.join('\n')}`)
      return
    }

    if (validFiles.length === 0) return

    onFilesSelected(validFiles)

    if (onUpload && showProgress) {
      setIsUploading(true)
      
      // Initialize files with progress and abort controllers
      const initialFiles: FileWithProgress[] = validFiles.map((file, index) => ({
        file,
        progress: 0,
        status: 'uploading' as const,
        id: `${Date.now()}-${index}`,
        abortController: new AbortController()
      }))
      
      setFilesWithProgress(initialFiles)

      try {
        // Progress update function
        const setProgress = (id: string, progress: number, status: FileWithProgress['status'] = 'uploading') => {
          setFilesWithProgress(prev => prev.map(item => 
            item.id === id ? { ...item, progress, status } : item
          ))
        }

        await onUpload(initialFiles, setProgress)
      } catch (error) {
        console.error('Upload failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        // Update specific files with error messages
        setFilesWithProgress(prev => prev.map(item => ({
          ...item,
          status: 'error' as const,
          error: errorMessage
        })))
      } finally {
        setIsUploading(false)
        // Clear progress after a delay
        setTimeout(() => setFilesWithProgress([]), 3000)
      }
    }
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, isUploading])

  // Click to select files
  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Progress bar component
  const ProgressBar: React.FC<{ fileWithProgress: FileWithProgress }> = ({ fileWithProgress }) => {
    const { file, progress, status } = fileWithProgress
    
    const getStatusColor = () => {
      switch (status) {
        case 'completed': return 'bg-green-500'
        case 'error': return 'bg-red-500'
        case 'processing': return 'bg-blue-500'
        default: return 'bg-blue-500'
      }
    }

    const getStatusText = () => {
      switch (status) {
        case 'completed': return 'Completed'
        case 'error': return fileWithProgress.error || 'Error'
        case 'processing': return 'Processing...'
        default: return `${Math.round(progress)}%`
      }
    }

    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700 truncate flex-1">
            {file.name}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-500">
              {getStatusText()}
            </span>
            {allowCancellation && status === 'uploading' && (
              <button
                onClick={() => cancelUpload(fileWithProgress.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Cancel upload"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${isDragOver && !disabled && !isUploading
            ? 'border-blue-500 bg-blue-50' 
            : 'border-neutral-300 hover:border-neutral-400'
          }
          ${disabled || isUploading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-neutral-50'
          }
          ${className}
        `}
      >
        {children}
        
        {/* Drag over overlay */}
        {isDragOver && !disabled && !isUploading && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="text-blue-600 font-medium">
              Drop files here
            </div>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {showProgress && filesWithProgress.length > 0 && (
        <div className="mt-4">
          {allowCancellation && isUploading && (
            <div className="flex justify-end mb-2">
              <button
                onClick={cancelAllUploads}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Cancel all uploads
              </button>
            </div>
          )}
          {filesWithProgress.map((fileWithProgress) => (
            <ProgressBar key={fileWithProgress.id} fileWithProgress={fileWithProgress} />
          ))}
        </div>
      )}
    </div>
  )
}

export { DragDropZone }