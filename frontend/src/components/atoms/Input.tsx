import React from 'react'
import { inputVariants, cn, type InputVariants } from '@/design-system'

export interface InputProps 
  extends React.InputHTMLAttributes<HTMLInputElement>,
         InputVariants {
  error?: boolean
  success?: boolean
}

/**
 * Input component with variants for different states
 * Supports all HTML input attributes plus custom styling variants
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    error,
    success,
    type = 'text',
    ...props 
  }, ref) => {
    // Determine variant based on state
    let inputVariant = variant
    if (error) inputVariant = 'error'
    if (success) inputVariant = 'success'

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant: inputVariant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }