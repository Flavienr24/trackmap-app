import React from 'react'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

/**
 * Tooltip wrapper component using shadcn/ui with backward compatibility
 * Provides simple interface for existing code while using modern Radix UI underneath
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  return (
    <TooltipProvider>
      <ShadcnTooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className={className}>
          <p>{content}</p>
        </TooltipContent>
      </ShadcnTooltip>
    </TooltipProvider>
  )
}