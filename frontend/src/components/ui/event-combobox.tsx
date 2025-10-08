import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface EventOption {
  value: string
  label?: string
  description?: string
}

interface EventComboboxProps {
  value: string
  onChange: (value: string) => void
  options: EventOption[]
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function EventCombobox({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner un event...',
  emptyMessage = 'Aucun event trouvé.',
  disabled = false,
  className,
}: EventComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [width, setWidth] = React.useState<number>(0)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Measure button width when it opens
  React.useEffect(() => {
    if (open && buttonRef.current) {
      setWidth(buttonRef.current.offsetWidth)
    }
  }, [open])

  // Sort options alphabetically
  const sortedOptions = React.useMemo(() => {
    return [...options].sort((a, b) => a.value.localeCompare(b.value))
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-left hover:bg-transparent hover:border-yellow-400',
            value ? 'font-mono' : 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className={cn('truncate', value && 'font-mono')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: width > 0 ? `${width}px` : 'auto' }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher..."
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm">{option.value}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
