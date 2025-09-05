import React from 'react'
import { badgeVariants, cn, type BadgeVariants, type StatusType } from '@/design-system'

export interface BadgeProps 
  extends React.HTMLAttributes<HTMLSpanElement>,
         BadgeVariants {
  children: React.ReactNode
  status?: StatusType
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
    children, 
    ...props 
  }, ref) => {
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

    return (
      <span
        className={cn(badgeVariants({ variant: badgeVariant, size }), className)}
        ref={ref}
        {...props}
      >
        {hasStatusDot && (
          <span className={cn('w-2 h-2 rounded-full mr-1.5', dotColor)} />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }