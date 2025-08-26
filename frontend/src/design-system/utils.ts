import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Focus ring utility for accessibility
 * Provides consistent focus styles across components
 */
export const focusRing = {
  default: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  white: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white',
  dark: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
  none: 'focus:outline-none',
} as const

/**
 * Common transition classes for components
 */
export const transitions = {
  default: 'transition-colors duration-200 ease-in-out',
  fast: 'transition-colors duration-150 ease-in-out',
  slow: 'transition-colors duration-300 ease-in-out',
  all: 'transition-all duration-200 ease-in-out',
  transform: 'transition-transform duration-200 ease-in-out',
  opacity: 'transition-opacity duration-200 ease-in-out',
} as const

/**
 * Status color mappings for TrackMap
 */
export const statusColors = {
  to_implement: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    dot: 'bg-yellow-400',
  },
  to_test: {
    bg: 'bg-blue-50',
    text: 'text-blue-800', 
    border: 'border-blue-300',
    dot: 'bg-blue-400',
  },
  validated: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-300', 
    dot: 'bg-green-400',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-400',
  },
} as const

export type StatusType = keyof typeof statusColors

/**
 * Component size mappings
 */
export const sizes = {
  xs: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    height: 'h-6',
    icon: 'w-3 h-3',
  },
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    height: 'h-8',
    icon: 'w-4 h-4',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-base',
    height: 'h-10',
    icon: 'w-5 h-5',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    height: 'h-12',
    icon: 'w-6 h-6',
  },
  xl: {
    padding: 'px-8 py-4',
    text: 'text-xl',
    height: 'h-14',
    icon: 'w-7 h-7',
  },
} as const

export type SizeType = keyof typeof sizes

/**
 * Common border radius values
 */
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg', 
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const

/**
 * Typography variants for consistent text styling
 */
export const typography = {
  h1: 'text-4xl font-bold tracking-tight text-neutral-900',
  h2: 'text-3xl font-bold tracking-tight text-neutral-900',
  h3: 'text-2xl font-semibold tracking-tight text-neutral-900',
  h4: 'text-xl font-semibold tracking-tight text-neutral-900',
  h5: 'text-lg font-semibold text-neutral-900',
  h6: 'text-base font-semibold text-neutral-900',
  body: 'text-base text-neutral-700',
  bodyLarge: 'text-lg text-neutral-700',
  bodySmall: 'text-sm text-neutral-600',
  caption: 'text-xs text-neutral-500 uppercase tracking-wide',
  code: 'font-mono text-sm bg-neutral-100 px-1.5 py-0.5 rounded',
  muted: 'text-neutral-500',
} as const

export type TypographyVariant = keyof typeof typography