import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const selectVariants = cva(
  [
    'block w-full rounded-md border transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-300 bg-white text-neutral-900',
          'hover:border-neutral-400',
          'focus:border-blue-500',
        ],
        error: [
          'border-red-300 bg-white text-neutral-900',
          'hover:border-red-400',
          'focus:border-red-500',
        ],
      },
      size: {
        sm: 'px-2 py-1 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface SelectOption {
  value: string
  label: string
}

interface SelectProps 
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size'>,
    VariantProps<typeof selectVariants> {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant, size, options, value, onChange, placeholder, error, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value)
    }

    return (
      <select
        ref={ref}
        value={value || ''}
        onChange={handleChange}
        className={selectVariants({ 
          variant: error ? 'error' : variant, 
          size, 
          className 
        })}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
)

Select.displayName = 'Select'

export { Select, type SelectOption }