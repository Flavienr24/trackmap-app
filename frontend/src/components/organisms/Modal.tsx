import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom'
  fixedHeight?: boolean
  contentClassName?: string
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md',
  fixedHeight = false,
  contentClassName,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    custom: 'max-w-none'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent 
        className={`${sizeClasses[size]} ${fixedHeight ? 'h-[80vh] flex flex-col' : ''} ${contentClassName ?? ''}`}
        onPointerDownOutside={onClose}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className={`${fixedHeight ? 'overflow-y-auto flex-1' : ''}`}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="flex-shrink-0 bg-muted/30 -mx-6 -mb-6 mt-6 px-6 py-4 rounded-b-lg">
            <div className="w-full">
              {footer}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { Modal }
