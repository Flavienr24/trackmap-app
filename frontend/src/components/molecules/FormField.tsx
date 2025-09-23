import React from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: string
  error?: string
  helperText?: string
  hint?: string
  required?: boolean
  containerClassName?: string
  children?: React.ReactNode
}

/**
 * FormField molecule combining Input atom with label and error messaging
 * Provides complete form field functionality with consistent styling
 */
const FormField: React.FC<FormFieldProps> = ({ 
  label,
  error,
  helperText,
  hint,
  required,
  containerClassName,
  children
}) => {
  return (
    <div className={cn('space-y-1', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="px-1">
        {children}
      </div>
      
      {(error || helperText || hint) && (
        <p className={cn(
          'text-xs',
          error ? 'text-red-600' : 'text-neutral-500'
        )}>
          {error || helperText || hint}
        </p>
      )}
    </div>
  )
}


export { FormField }