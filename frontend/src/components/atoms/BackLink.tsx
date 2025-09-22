import React from 'react'
import { Link } from 'react-router'
import { cn } from '@/design-system'

interface BackLinkProps {
  to: string
  children: React.ReactNode
  className?: string
}

/**
 * BackLink component - Styled navigation link with chevron for going back
 * Uses link styling with hover effects and chevron icon
 */
const BackLink: React.FC<BackLinkProps> = ({ to, children, className }) => {
  return (
    <Link 
      to={to}
      className={cn(
        'inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-200',
        'hover:underline decoration-1 underline-offset-2',
        className
      )}
    >
      <svg 
        className="w-4 h-4 mr-1.5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
      {children}
    </Link>
  )
}

export { BackLink }