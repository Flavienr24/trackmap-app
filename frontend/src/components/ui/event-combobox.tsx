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
  const [searchValue, setSearchValue] = React.useState('')
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Measure button width when it opens
  React.useEffect(() => {
    if (open && buttonRef.current) {
      setWidth(buttonRef.current.offsetWidth)
    }
  }, [open])

  // Reset search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchValue('')
    }
  }, [open])

  const [displayLimit, setDisplayLimit] = React.useState(20)

  // Reset display limit when search changes
  React.useEffect(() => {
    setDisplayLimit(20)
  }, [searchValue])

  // Sort all events by usage count
  const sortedByUsage = React.useMemo(() => {
    const eventCounts = new Map<string, number>()

    // Count occurrences of each event
    options.forEach(option => {
      eventCounts.set(option.value, (eventCounts.get(option.value) || 0) + 1)
    })

    // Get unique events and sort by count (descending), then alphabetically
    const uniqueEvents = Array.from(new Set(options.map(o => o.value)))
    return uniqueEvents.sort((a, b) => {
      const countDiff = (eventCounts.get(b) || 0) - (eventCounts.get(a) || 0)
      if (countDiff !== 0) return countDiff
      return a.localeCompare(b)
    })
  }, [options])

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    // If search is less than 3 characters, show all sorted by usage
    if (searchValue.length < 3) {
      return sortedByUsage
    }

    // Filter: only events that START with search value (case insensitive)
    const searchLower = searchValue.toLowerCase()
    return sortedByUsage.filter(eventValue =>
      eventValue.toLowerCase().startsWith(searchLower)
    )
  }, [searchValue, sortedByUsage])

  // Apply lazy loading limit
  const displayedOptions = React.useMemo(() => {
    return filteredOptions.slice(0, displayLimit)
  }, [filteredOptions, displayLimit])

  const hasMore = filteredOptions.length > displayLimit

  // Handle scroll to load more
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50

    if (scrolledToBottom && hasMore) {
      setDisplayLimit(prev => prev + 20)
    }
  }, [hasMore])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
            placeholder="Rechercher... (3 caractères min)"
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList onScroll={handleScroll}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {displayedOptions.map((eventValue) => (
                <CommandItem
                  key={eventValue}
                  value={eventValue}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === eventValue ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm">{eventValue}</div>
                  </div>
                </CommandItem>
              ))}
              {hasMore && (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  Scroll pour charger plus...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
