import * as React from "react"
import { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { EventStatus } from '@/types'
import { getStatusLabel } from '@/utils/properties'

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-neutral-900",
        // TrackMap business status variants
        to_implement: "border-warning/30 bg-warning/10 text-black",
        to_test: "border-info/30 bg-info/10 text-black",
        validated: "border-success/30 bg-success/10 text-black",
        error: "border-error/30 bg-error/10 text-black",
        TO_IMPLEMENT: "border-warning/30 bg-warning/10 text-black",
        TO_TEST: "border-info/30 bg-info/10 text-black",
        VALIDATED: "border-success/30 bg-success/10 text-black",
        ERROR: "border-error/30 bg-error/10 text-black",
        // Additional variants
        primary: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  status?: EventStatus | string
  showDropdownArrow?: boolean
  onStatusChange?: (newStatus: EventStatus) => void
  disabled?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant,
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
    const badgeVariant = (status || variant) as any

    // Define dot colors for status badges (support both cases)
    const dotColors = {
      to_implement: 'bg-warning',
      to_test: 'bg-info', 
      validated: 'bg-success',
      error: 'bg-error',
      TO_IMPLEMENT: 'bg-warning',
      TO_TEST: 'bg-info', 
      VALIDATED: 'bg-success',
      ERROR: 'bg-error',
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
            badgeVariants({ variant: badgeVariant }), 
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
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[9999] min-w-[140px]">
            {statusOptions.map((statusOption) => (
              <button
                key={statusOption}
                onClick={(e) => handleStatusSelect(e, statusOption)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center',
                  status === statusOption && 'bg-accent font-medium'
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
Badge.displayName = "Badge"

export { Badge, badgeVariants }