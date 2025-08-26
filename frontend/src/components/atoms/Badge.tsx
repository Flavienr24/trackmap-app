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

    return (
      <span
        className={cn(badgeVariants({ variant: badgeVariant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }