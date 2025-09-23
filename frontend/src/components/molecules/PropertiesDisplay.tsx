import React from 'react'
import { cn } from '@/lib/utils'

export interface PropertiesDisplayProps {
  properties: Record<string, any>
  className?: string
}

/**
 * PropertiesDisplay component for showing event properties with copy functionality
 */
export const PropertiesDisplay: React.FC<PropertiesDisplayProps> = ({
  properties,
  className,
}) => {
  // Function to determine if a value is contextual (starts with $ or contains dynamic variables)
  const isContextualValue = (value: any): boolean => {
    const stringValue = String(value)
    return stringValue.startsWith('$') || 
           stringValue.includes('{{') || 
           stringValue.includes('${') ||
           /\{\{.*\}\}/.test(stringValue) ||
           /\$\{.*\}/.test(stringValue)
  }

  const propertyEntries = Object.entries(properties)

  if (propertyEntries.length === 0) {
    return (
      <div className={cn('pt-2 pr-4 pb-2 text-sm text-muted-foreground', className)}>
        Aucune propriété définie
      </div>
    )
  }

  return (
    <div className={cn('pt-2 pr-4 pb-2', className)}>
      
      <div className="space-y-1">
        {propertyEntries.map(([key, value]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1">
            <div className="text-xs font-normal text-muted-foreground min-w-0 sm:w-1/6 font-mono">
              {key}
            </div>
            <div className="text-sm text-foreground min-w-0 sm:w-5/6">
              <code className={cn(
                "bg-muted px-2 py-1 rounded text-xs break-all font-mono",
                isContextualValue(value) 
                  ? "text-purple-700 dark:text-purple-300" 
                  : "text-foreground"
              )}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}