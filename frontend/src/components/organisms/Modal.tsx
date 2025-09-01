import React from 'react'
import { Button } from '@/components/atoms/Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  fixedHeight?: boolean
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md',
  fixedHeight = false
}) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg ${sizeClasses[size]} w-full ${fixedHeight ? 'max-h-[80vh] flex flex-col' : ''}`}>
        <div className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
        
        <div className={`px-6 py-4 ${fixedHeight ? 'overflow-y-auto flex-1' : ''}`}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export { Modal }