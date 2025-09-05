import React, { useState, useRef, useEffect } from 'react'
import { badgeVariants, cn, type BadgeVariants, type StatusType } from '@/design-system'
import type { EventStatus } from '@/types'
import { getStatusLabel } from '@/utils/properties'

export interface BadgeProps 
  extends React.HTMLAttributes<HTMLSpanElement>,
         BadgeVariants {
  children: React.ReactNode
  status?: StatusType
  showDropdownArrow?: boolean
  onStatusChange?: (newStatus: EventStatus) => void
  disabled?: boolean
}

/**
 * Badge component for status indicators and labels
 * Supports TrackMap-specific status variants with colored dots
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size,
    status,
    showDropdownArrow = false,
    onStatusChange,
    disabled = false,
    children, 
    onClick,
    ...props 
  }, ref) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Use status as variant if provided
    const badgeVariant = status || variant

    // Define dot colors for status badges (support both cases)
    const dotColors = {
      to_implement: 'bg-yellow-400',
      to_test: 'bg-blue-400', 
      validated: 'bg-green-400',
      error: 'bg-red-400',
      TO_IMPLEMENT: 'bg-yellow-400',
      TO_TEST: 'bg-blue-400', 
      VALIDATED: 'bg-green-400',
      ERROR: 'bg-red-400',
    } as const

    const hasStatusDot = status && status in dotColors
    const dotColor = hasStatusDot ? dotColors[status as keyof typeof dotColors] : null

    // Available status options
    const statusOptions: EventStatus[] = ['to_implement', 'to_test', 'validated', 'error']

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false)
        }
      }

      if (isDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isDropdownOpen])

    const handleBadgeClick = (e: React.MouseEvent<HTMLSpanElement>) => {
      e.stopPropagation()
      if (showDropdownArrow && onStatusChange && !disabled) {
        setIsDropdownOpen(!isDropdownOpen)
      }
      onClick?.(e)
    }

    const handleStatusSelect = (e: React.MouseEvent, newStatus: EventStatus) => {
      e.stopPropagation()
      setIsDropdownOpen(false)
      onStatusChange?.(newStatus)
    }

    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <span
          className={cn(
            badgeVariants({ variant: badgeVariant, size }), 
            className,
            showDropdownArrow && onStatusChange && !disabled && 'cursor-pointer hover:opacity-80 transition-opacity'
          )}
          ref={ref}
          onClick={handleBadgeClick}
          {...props}
        >
          {hasStatusDot && (
            <span className={cn('w-2 h-2 rounded-full mr-1.5', dotColor)} />
          )}
          {children}
          {showDropdownArrow && (
            <svg 
              className={cn(
                'ml-1.5 w-3 h-3 opacity-70 transition-transform',
                isDropdownOpen && 'rotate-180'
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          )}
        </span>

        {/* Dropdown Menu */}
        {isDropdownOpen && showDropdownArrow && onStatusChange && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-[9999] min-w-[140px]">
            {statusOptions.map((statusOption) => (
              <button
                key={statusOption}
                onClick={(e) => handleStatusSelect(e, statusOption)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 transition-colors flex items-center',
                  status === statusOption && 'bg-neutral-100 font-medium'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full mr-2', dotColors[statusOption])} />
                {getStatusLabel(statusOption)}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }