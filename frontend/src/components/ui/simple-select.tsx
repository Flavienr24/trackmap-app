import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SelectOption {
  value: string
  label: string
}

interface SimpleSelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Compatibility wrapper for legacy Select API
export const SimpleSelect = React.forwardRef<HTMLButtonElement, SimpleSelectProps>(
  ({ options, value, onChange, placeholder, disabled, className }, ref) => {
    return (
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className={className} ref={ref}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
)

SimpleSelect.displayName = 'SimpleSelect'