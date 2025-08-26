/**
 * TrackMap Design System
 * 
 * Centralized design system exports for consistent UI components
 * Built with Atomic Design principles and design tokens
 */

// Core tokens and utilities
export { tokens } from './tokens'
export { 
  cn, 
  focusRing, 
  transitions, 
  statusColors, 
  sizes, 
  borderRadius, 
  typography,
  type StatusType,
  type SizeType,
  type TypographyVariant,
} from './utils'

// Component variants
export {
  buttonVariants,
  badgeVariants, 
  inputVariants,
  cardVariants,
  textVariants,
  type ButtonVariants,
  type BadgeVariants,
  type InputVariants,
  type CardVariants,
  type TextVariants,
} from './variants'

// Re-export cva for custom component variants
export { cva, type VariantProps } from 'class-variance-authority'