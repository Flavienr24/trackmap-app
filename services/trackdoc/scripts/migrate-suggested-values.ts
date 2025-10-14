/**
 * Migration script to synchronize existing event properties with suggested values
 * This ensures all values used in events are available in the suggested values library
 *
 * 🚨 SECURITY: This script modifies data in bulk - use with caution
 */

import { PrismaClient } from '@prisma/client';
import logger from '../src/config/logger';

// 🚨 CRITICAL SECURITY: Environment validation
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Primary protection: Block production environment
if (NODE_ENV === 'production') {
  throw new Error(
    '🚨 CRITICAL: Migration script forbidden in production!\n' +
    'This script performs bulk data modifications.\n' +
    `NODE_ENV: ${NODE_ENV}\n` +
    'Review and adapt for production use case.'
  );
}

// Secondary protection: Warn on production-like DATABASE_URL patterns
if (DATABASE_URL.includes('prod') ||
    DATABASE_URL.includes('production') ||
    (DATABASE_URL.includes('postgres') && !DATABASE_URL.includes('localhost'))) {
  throw new Error(
    '🚨 CRITICAL: This script modifies data in bulk!\n' +
    'Detected production-like database URL. Refusing to run.\n' +
    `DATABASE_URL: ${DATABASE_URL}\n` +
    `NODE_ENV: ${NODE_ENV}\n\n` +
    'Safe patterns: localhost, dev.db, test.db\n' +
    'If this is intentional, set NODE_ENV=development explicitly.'
  );
}

logger.info('Environment validation passed', { NODE_ENV, DATABASE_URL });

const prisma = new PrismaClient();

async function migrateSuggestedValues() {
  logger.info('Starting suggested values migration with transaction wrapper...');

  try {
    // Wrap all data modifications in a single transaction
    // This ensures atomicity: all changes succeed or all fail together
    const result = await prisma.$transaction(
      async (tx) => {
        // Get all events with their properties
        const events = await tx.event.findMany({
          include: {
            page: {
              include: {
                product: true
              }
            }
          }
        });

        logger.info(`Found ${events.length} events to process`);

        const processedValues = new Set<string>();
        let createdCount = 0;
        let associationCount = 0;

        for (const event of events) {
      if (!event.properties) continue;

      let properties: Record<string, any>;
      try {
        properties = JSON.parse(event.properties);
      } catch (error) {
        logger.warn(`Failed to parse properties for event ${event.id}: ${event.properties}`);
        continue;
      }

      if (!properties || Object.keys(properties).length === 0) continue;

      const productId = event.page.productId;
      logger.debug(`Processing event ${event.name} for product ${event.page.product.name}`);

      for (const [propertyName, propertyValue] of Object.entries(properties)) {
        // Convert property value to string for comparison
        const stringValue = String(propertyValue);
        const valueKey = `${productId}:${stringValue}`;

        // Skip if we've already processed this value for this product
        if (processedValues.has(valueKey)) continue;
        processedValues.add(valueKey);

        // Auto-detect contextual values (those starting with $)
        const isContextual = stringValue.startsWith('$');

        // Check if suggested value already exists for this product
        const existingSuggestedValue = await tx.suggestedValue.findFirst({
          where: {
            productId,
            value: stringValue
          }
        });

        if (!existingSuggestedValue) {
          try {
            const suggestedValue = await tx.suggestedValue.create({
              data: {
                productId,
                value: stringValue,
                isContextual
              }
            });

            createdCount++;
            logger.info(`Created suggested value: "${stringValue}" (contextual: ${isContextual})`);
          } catch (error: any) {
            if (error.code === 'P2002') {
              logger.debug(`Suggested value already exists due to race condition: "${stringValue}"`);
            } else {
              throw error;
            }
          }
        }

        // Associate with property if it exists
        const property = await tx.property.findFirst({
          where: {
            productId,
            name: propertyName
          }
        });

        if (property) {
          const suggestedValue = existingSuggestedValue || await tx.suggestedValue.findFirst({
            where: {
              productId,
              value: stringValue
            }
          });

          if (suggestedValue) {
            // Check if association already exists
            const existingAssociation = await tx.propertyValue.findUnique({
              where: {
                propertyId_suggestedValueId: {
                  propertyId: property.id,
                  suggestedValueId: suggestedValue.id
                }
              }
            });

            if (!existingAssociation) {
              try {
                await tx.propertyValue.create({
                  data: {
                    propertyId: property.id,
                    suggestedValueId: suggestedValue.id
                  }
                });

                associationCount++;
                logger.info(`Created association: ${property.name} -> "${stringValue}"`);
              } catch (error: any) {
                if (error.code === 'P2002') {
                  logger.debug(`Association already exists: ${property.name} -> "${stringValue}"`);
                } else {
                  throw error;
                }
              }
            }
          }
        }
      }
    }

    // Return stats for logging outside transaction
    return {
      eventsProcessed: events.length,
      suggestedValuesCreated: createdCount,
      associationsCreated: associationCount
    };
      },
      {
        maxWait: 30000,  // 30s max wait for transaction to start
        timeout: 120000, // 2min max execution time for transaction
      }
    );

    logger.info('Migration completed successfully', result);

  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSuggestedValues()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateSuggestedValues };