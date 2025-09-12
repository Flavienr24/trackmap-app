import type { FileWithProgress } from '@/components/molecules/DragDropZone'

export interface UploadOptions {
  url: string
  onProgress?: (progress: number) => void
  onComplete?: (response: any) => void
  onError?: (error: Error) => void
}

/**
 * Smart progress calculation for hybrid architecture
 * Frontend progress (0-80%) + Processing time (80-100%)
 */
export const calculateSmartProgress = (uploadProgress: number, isProcessing: boolean = false): number => {
  if (isProcessing) {
    // During processing phase, slowly increment from 80% to 100%
    return Math.min(100, 80 + uploadProgress * 0.2)
  }
  // During upload phase, scale to 80% max
  return Math.min(80, uploadProgress)
}

/**
 * Upload file with XMLHttpRequest and smart progress tracking
 */
export const uploadFileWithProgress = (file: File, options: UploadOptions): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    
    // Use 'images' as field name to match backend expectation
    formData.append('images', file)

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const uploadProgress = (event.loaded / event.total) * 100
        const smartProgress = calculateSmartProgress(uploadProgress, false)
        options.onProgress?.(smartProgress)
      }
    })

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          
          // Simulate processing phase (80% -> 100%)
          options.onProgress?.(85)
          setTimeout(() => {
            options.onProgress?.(95)
            setTimeout(() => {
              options.onProgress?.(100)
              options.onComplete?.(response)
              resolve(response)
            }, 200)
          }, 300)
          
        } catch (error) {
          const parseError = new Error('Failed to parse response')
          options.onError?.(parseError)
          reject(parseError)
        }
      } else {
        const httpError = new Error(`HTTP Error: ${xhr.status}`)
        options.onError?.(httpError)
        reject(httpError)
      }
    })

    // Handle network errors
    xhr.addEventListener('error', () => {
      const networkError = new Error('Network error during upload')
      options.onError?.(networkError)
      reject(networkError)
    })

    // Handle timeouts
    xhr.addEventListener('timeout', () => {
      const timeoutError = new Error('Upload timeout')
      options.onError?.(timeoutError)
      reject(timeoutError)
    })

    // Configure and send request
    xhr.timeout = 60000 // 60 seconds timeout
    xhr.open('POST', options.url)
    xhr.send(formData)
  })
}

/**
 * Upload multiple files with progress tracking
 */
export const uploadMultipleFilesWithProgress = async (
  eventId: string,
  filesWithProgress: FileWithProgress[],
  setProgress: (id: string, progress: number, status?: FileWithProgress['status']) => void
): Promise<any[]> => {
  const results: any[] = []
  
  // Upload files sequentially to better track individual progress
  for (const fileWithProgress of filesWithProgress) {
    const { file, id } = fileWithProgress
    
    try {
      setProgress(id, 0, 'uploading')
      
      const result = await uploadFileWithProgress(file, {
        url: `/api/events/${eventId}/screenshots`,
        onProgress: (progress) => {
          const status = progress >= 80 ? 'processing' : 'uploading'
          setProgress(id, progress, status)
        }
      })
      
      setProgress(id, 100, 'completed')
      results.push(result)
      
    } catch (error) {
      console.error(`Upload failed for file ${file.name}:`, error)
      setProgress(id, 0, 'error')
      // Continue with other files instead of failing completely
    }
  }
  
  return results
}

/**
 * Utility to check if file is PDF
 */
export const isPDF = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Utility to check if file is image
 */
export const isImage = (file: File): boolean => {
  return file.type.startsWith('image/')
}

/**
 * Get file type label for display
 */
export const getFileTypeLabel = (file: File): string => {
  if (isPDF(file)) return 'PDF'
  if (isImage(file)) return 'Image'
  return 'File'
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}