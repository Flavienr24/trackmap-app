import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Button Component Variants
 * Defines all possible button variations using class-variance-authority
 */
export const buttonVariants = cva(
  // Base classes applied to all buttons
  [
    'inline-flex items-center justify-center',
    'font-medium transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    'relative overflow-hidden',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600 text-white border border-transparent',
          'hover:bg-blue-700 focus:ring-blue-500',
          'active:bg-blue-800',
        ],
        secondary: [
          'bg-neutral-100 text-neutral-900 border border-neutral-300',
          'hover:bg-neutral-200 hover:border-neutral-400 focus:ring-neutral-500',
          'active:bg-neutral-300',
        ],
        outline: [
          'bg-transparent text-blue-600 border border-blue-300',
          'hover:bg-blue-50 hover:border-blue-400 focus:ring-blue-500',
          'active:bg-blue-100',
        ],
        ghost: [
          'bg-transparent text-neutral-600 border border-transparent',
          'hover:bg-neutral-100 hover:text-neutral-900 focus:ring-neutral-500',
          'active:bg-neutral-200',
        ],
        danger: [
          'bg-transparent text-red-600 border border-red-300',
          'hover:bg-red-50 hover:border-red-400 focus:ring-red-500',
          'active:bg-red-100',
        ],
        success: [
          'bg-green-600 text-white border border-transparent',
          'hover:bg-green-700 focus:ring-green-500',
          'active:bg-green-800',
        ],
      },
      size: {
        xs: 'px-2 py-1 text-xs h-6 rounded',
        sm: 'px-3 py-1.5 text-sm h-8 rounded-md',
        md: 'px-4 py-2 text-base h-10 rounded-md',
        lg: 'px-6 py-3 text-lg h-12 rounded-lg',
        xl: 'px-8 py-4 text-xl h-14 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

/**
 * Badge/Status Component Variants
 */
export const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'font-medium rounded-full border',
    'transition-colors duration-200',
  ],
  {
    variants: {
      variant: {
        to_implement: [
          'bg-yellow-50 text-yellow-800 border-yellow-300',
        ],
        to_test: [
          'bg-blue-50 text-blue-800 border-blue-300',
        ],
        validated: [
          'bg-green-50 text-green-800 border-green-300',
        ],
        error: [
          'bg-red-50 text-red-800 border-red-300',
        ],
        TO_IMPLEMENT: [
          'bg-yellow-50 text-yellow-800 border-yellow-300',
        ],
        TO_TEST: [
          'bg-blue-50 text-blue-800 border-blue-300',
        ],
        VALIDATED: [
          'bg-green-50 text-green-800 border-green-300',
        ],
        ERROR: [
          'bg-red-50 text-red-800 border-red-300',
        ],
        default: [
          'bg-neutral-50 text-neutral-600 border-neutral-300',
        ],
        primary: [
          'bg-primary-50 text-primary-700 border-primary-300',
        ],
      },
      size: {
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-xs', 
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

/**
 * Input Component Variants
 */
export const inputVariants = cva(
  [
    'block w-full border rounded-md',
    'placeholder:text-neutral-400',
    'focus:ring-2 focus:ring-offset-0 focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50',
    'transition-colors duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-300 text-neutral-900 bg-white',
          'focus:border-primary-500 focus:ring-primary-500',
        ],
        error: [
          'border-red-300 text-red-900 bg-red-50',
          'focus:border-red-500 focus:ring-red-500',
          'placeholder:text-red-300',
        ],
        success: [
          'border-green-300 text-green-900 bg-green-50',
          'focus:border-green-500 focus:ring-green-500',
          'placeholder:text-green-300',
        ],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm h-8',
        md: 'px-4 py-2 text-base h-10', 
        lg: 'px-6 py-3 text-lg h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

/**
 * Card Component Variants
 */
export const cardVariants = cva(
  [
    'bg-white border rounded-lg',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: 'border-neutral-200',
        elevated: 'border-neutral-200 shadow-md',
        outlined: 'border-neutral-300',
        interactive: [
          'border-neutral-200 hover:border-neutral-300 hover:shadow-sm',
          'cursor-pointer transition-all duration-200',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

/**
 * Text/Typography Component Variants
 */
export const textVariants = cva('', {
  variants: {
    variant: {
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
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
  },
  defaultVariants: {
    variant: 'body',
    align: 'left',
  },
})

// Export types for TypeScript
export type ButtonVariants = VariantProps<typeof buttonVariants>
export type BadgeVariants = VariantProps<typeof badgeVariants>
export type InputVariants = VariantProps<typeof inputVariants>
export type CardVariants = VariantProps<typeof cardVariants>
export type TextVariants = VariantProps<typeof textVariants>