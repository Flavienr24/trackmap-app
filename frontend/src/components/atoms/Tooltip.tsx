import React, { useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

/**
 * Simple tooltip component with hover behavior
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div 
        className={`absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 ${
          isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
        } transition-all duration-200 ${className}`}
      >
        {content}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="border-4 border-transparent border-t-neutral-800"></div>
        </div>
      </div>
    </div>
  )
}