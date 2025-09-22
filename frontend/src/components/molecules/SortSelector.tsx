import React from 'react'
import { Select } from '@/components/atoms/Select'

export type SortOption = 
  | 'created_desc' 
  | 'created_asc'
  | 'updated_desc' 
  | 'updated_asc'
  | 'name_asc' 
  | 'name_desc'
  | 'status_grouped'

export interface SortSelectorProps {
  value: SortOption
  onChange: (sortOption: SortOption) => void
  options?: Array<{ value: SortOption; label: string }>
  className?: string
}

const DEFAULT_SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'created_desc', label: 'Plus récent créé' },
  { value: 'created_asc', label: 'Plus ancien créé' },
  { value: 'updated_desc', label: 'Plus récent modifié' },
  { value: 'updated_asc', label: 'Plus ancien modifié' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'name_desc', label: 'Nom Z-A' },
  { value: 'status_grouped', label: 'Regrouper par statut' }
]

/**
 * SortSelector component for table sorting
 * Provides a clean dropdown interface for sorting options
 */
export const SortSelector: React.FC<SortSelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  className
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <label className="text-sm font-medium text-neutral-700">
        Tri :
      </label>
      <Select
        value={value}
        onChange={(value: string) => onChange(value as SortOption)}
        options={options}
        className="!w-[210px]"
      />
    </div>
  )
}