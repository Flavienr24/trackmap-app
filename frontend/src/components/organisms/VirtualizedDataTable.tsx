import React from 'react'
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EventStatus } from '@/types'
import type { Column, Action } from './DataTable'

export interface VirtualizedDataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (record: T) => void
  onStatusChange?: (record: T, newStatus: any) => void
  className?: string
  rowHeight?: number
  height?: number
}

/**
 * Virtualized DataTable for large datasets (100+ rows)
 * Uses react-window for efficient rendering of visible rows only
 * Simplified version without expandable rows for better performance
 */
function VirtualizedDataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  onStatusChange,
  className,
  rowHeight = 60,
  height = 600,
}: VirtualizedDataTableProps<T>) {

  const renderCellValue = (column: Column<T>, record: T) => {
    const value = record[column.key]

    if (column.render) {
      return column.render(value, record)
    }

    // Handle status badges automatically
    if (column.key === 'status' || column.key.includes('status')) {
      return (
        <Badge
          status={value as EventStatus}
          showDropdownArrow={true}
          onStatusChange={onStatusChange ? (newStatus: EventStatus) => onStatusChange(record, newStatus) : undefined}
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

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = data[index]
    const isClickable = onRowClick !== undefined

    return (
      <div
        style={style}
        className={cn(
          'flex items-center border-b border-neutral-200 hover:bg-neutral-50',
          isClickable && 'cursor-pointer'
        )}
        onClick={() => isClickable && onRowClick(record)}
      >
        {columns.map((column, colIndex) => (
          <div
            key={column.key}
            className={cn(
              'px-6 py-3 text-sm flex-1',
              colIndex === 0 && 'font-medium text-neutral-900',
              colIndex > 0 && 'text-neutral-500'
            )}
            style={{ width: column.width || 'auto' }}
          >
            {renderCellValue(column, record)}
          </div>
        ))}
        {actions && actions.length > 0 && (
          <div className="px-6 py-3 flex items-center space-x-2 flex-shrink-0">
            {actions.map((action, actionIndex) => {
              if (action.show && !action.show(record)) return null

              const label = typeof action.label === 'function' ? action.label(record) : action.label
              const title = action.title
                ? (typeof action.title === 'function' ? action.title(record) : action.title)
                : label

              return (
                <button
                  key={actionIndex}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick(record)
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    action.variant === 'danger' && 'text-red-600 hover:bg-red-50',
                    action.variant === 'primary' && 'text-blue-600 hover:bg-blue-50',
                    (!action.variant || action.variant === 'secondary') && 'text-neutral-600 hover:bg-neutral-100'
                  )}
                  title={title}
                >
                  {action.icon && action.iconOnly ? action.icon : label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
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
      <div className={cn('overflow-hidden rounded-lg border border-neutral-200')}>
        {/* Header */}
        <div className="bg-neutral-50 border-b border-neutral-200 flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider flex-1"
              style={{ width: column.width || 'auto' }}
            >
              {column.title}
            </div>
          ))}
          {actions && actions.length > 0 && (
            <div className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider flex-shrink-0">
              Actions
            </div>
          )}
        </div>

        {/* Virtualized body */}
        <List
          height={height}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
        >
          {Row}
        </List>
      </div>

      <div className="mt-2 text-sm text-neutral-500 text-center">
        Affichage de {data.length} lignes (mode virtualisé pour performance)
      </div>
    </div>
  )
}

export { VirtualizedDataTable }
