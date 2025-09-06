import React, { useState, useEffect } from 'react'
import { Button } from '../atoms/Button'
import { Badge } from '../atoms/Badge'
import { SortSelector, type SortOption } from '../molecules/SortSelector'
import { cn, type StatusType } from '@/design-system'
import { sortData, getDefaultSortOption, saveSortPreference, loadSortPreference } from '@/utils/sorting'

export interface Column<T = any> {
  key: string
  title: string
  render?: (value: any, record: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

export interface Action<T = any> {
  label: string | ((record: T) => string)
  onClick: (record: T) => void
  variant?: 'primary' | 'secondary' | 'danger'
  icon?: React.ReactNode
  show?: (record: T) => boolean
  iconOnly?: boolean
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (record: T) => void
  onStatusChange?: (record: T, newStatus: any) => void
  enableSort?: boolean
  sortContext?: string
  sortOptions?: Array<{ value: SortOption; label: string }>
  className?: string
}

/**
 * DataTable organism for displaying tabular data
 * Supports custom rendering, actions, and interactive rows
 */
function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  onStatusChange,
  enableSort = false,
  sortContext = 'default',
  sortOptions,
  className,
}: DataTableProps<T>) {
  
  // Sort state management
  const [currentSort, setCurrentSort] = useState<SortOption>(() => {
    if (!enableSort) return 'created_desc'
    return loadSortPreference(sortContext) || getDefaultSortOption(sortContext)
  })

  // Save sort preference when it changes
  useEffect(() => {
    if (enableSort) {
      saveSortPreference(sortContext, currentSort)
    }
  }, [currentSort, enableSort, sortContext])

  // Apply sorting to data
  const sortedData = enableSort ? sortData(data, currentSort) : data

  const handleSortChange = (newSort: SortOption) => {
    setCurrentSort(newSort)
  }

  const renderCellValue = (column: Column<T>, record: T) => {
    const value = record[column.key]
    
    if (column.render) {
      return column.render(value, record)
    }
    
    // Handle status badges automatically
    if (column.key === 'status' || column.key.includes('status')) {
      return (
        <Badge 
          status={value as StatusType} 
          showDropdownArrow={true}
          onStatusChange={onStatusChange ? (newStatus) => onStatusChange(record, newStatus) : undefined}
        >
          {value}
        </Badge>
      )
    }
    
    // Handle dates
    if (value && (column.key.includes('_at') || column.key.includes('date'))) {
      return new Date(value).toLocaleDateString('fr-FR')
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return value.toLocaleString('fr-FR')
    }
    
    return value || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-neutral-600">Chargement...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-neutral-400 text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          Aucune donnée
        </h3>
        <p className="text-neutral-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {enableSort && (
        <div className="mb-4 flex justify-end">
          <SortSelector
            value={currentSort}
            onChange={handleSortChange}
            options={sortOptions}
          />
        </div>
      )}
      
      <div className={cn('overflow-visible rounded-lg border border-neutral-200')}>
        <div>
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider',
                    column.width && `w-[${column.width}]`
                  )}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <button className="text-neutral-400 hover:text-neutral-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedData.map((record, index) => (
              <tr
                key={record.id || index}
                className={cn(
                  'hover:bg-neutral-50 transition-colors duration-150',
                  onRowClick && 'cursor-pointer',
                  columns.some(col => col.key === 'status' || col.key.includes('status')) && 'overflow-visible'
                )}
                onClick={() => onRowClick?.(record)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm text-neutral-900",
                      (column.key === 'status' || column.key.includes('status')) && "overflow-visible relative"
                    )}
                  >
                    {renderCellValue(column, record)}
                  </td>
                ))}
                
                {actions && actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {actions
                        .filter(action => !action.show || action.show(record))
                        .map((action, actionIndex) => (
                        action.iconOnly ? (
                          <button
                            key={actionIndex}
                            className="p-2 text-neutral-600 hover:text-neutral-900 cursor-pointer transition-colors duration-150"
                            onClick={(e) => {
                              e.stopPropagation()
                              action.onClick(record)
                            }}
                          >
                            {action.icon}
                          </button>
                        ) : (
                          <Button
                            key={actionIndex}
                            size="sm"
                            variant={action.variant || 'secondary'}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.onClick(record)
                            }}
                          >
                            {action.icon && <span className="mr-1">{action.icon}</span>}
                            {typeof action.label === 'function' ? action.label(record) : action.label}
                          </Button>
                        )
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export { DataTable }