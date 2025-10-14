/**
 * Import Context Schema
 *
 * Shared Zod schema for import context response to ensure type safety
 * between backend and frontend. Used for validation and TypeScript type generation.
 */

import { z } from 'zod';

/**
 * Associated value schema - represents a suggested value linked to a property
 */
export const AssociatedValueSchema = z.object({
  id: z.string(),
  value: z.string()
});

/**
 * Property context schema - includes property details and associated values
 */
export const PropertyContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  associatedValues: z.array(AssociatedValueSchema)
});

/**
 * Suggested value context schema - includes value details and contextual flag
 */
export const SuggestedValueContextSchema = z.object({
  id: z.string(),
  value: z.string(),
  isContextual: z.boolean()
});

/**
 * Pagination metadata schema - provides information about pagination state
 */
export const PaginationSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  totals: z.object({
    events: z.number(),
    properties: z.number(),
    suggestedValues: z.number()
  }),
  hasMore: z.object({
    events: z.boolean(),
    properties: z.boolean(),
    suggestedValues: z.boolean()
  })
});

/**
 * Main import context schema - complete response structure
 */
export const ImportContextSchema = z.object({
  eventNames: z.array(z.string()),
  properties: z.array(PropertyContextSchema),
  suggestedValues: z.array(SuggestedValueContextSchema),
  pagination: PaginationSchema
});

/**
 * Query parameters schema for import context endpoint
 */
export const ImportContextQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0)
}).optional();

// Export TypeScript types (generated from Zod schemas)
export type ImportContextResponse = z.infer<typeof ImportContextSchema>;
export type PropertyContext = z.infer<typeof PropertyContextSchema>;
export type SuggestedValueContext = z.infer<typeof SuggestedValueContextSchema>;
export type AssociatedValue = z.infer<typeof AssociatedValueSchema>;
export type PaginationMetadata = z.infer<typeof PaginationSchema>;
export type ImportContextQuery = z.infer<typeof ImportContextQuerySchema>;
