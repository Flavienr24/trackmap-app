/**
 * Migration script to synchronize existing event properties with suggested values
 * This ensures all values used in events are available in the suggested values library
 */

import { PrismaClient } from '@prisma/client';
import logger from '../src/config/logger';

const prisma = new PrismaClient();

async function migrateSuggestedValues() {
  logger.info('Starting suggested values migration...');
  
  try {
    // Get all events with their properties
    const events = await prisma.event.findMany({
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
        const existingSuggestedValue = await prisma.suggestedValue.findFirst({
          where: { 
            productId,
            value: stringValue 
          }
        });

        if (!existingSuggestedValue) {
          try {
            const suggestedValue = await prisma.suggestedValue.create({
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
        const property = await prisma.property.findFirst({
          where: { 
            productId,
            name: propertyName 
          }
        });

        if (property) {
          const suggestedValue = existingSuggestedValue || await prisma.suggestedValue.findFirst({
            where: { 
              productId,
              value: stringValue 
            }
          });

          if (suggestedValue) {
            // Check if association already exists
            const existingAssociation = await prisma.propertyValue.findUnique({
              where: {
                propertyId_suggestedValueId: {
                  propertyId: property.id,
                  suggestedValueId: suggestedValue.id
                }
              }
            });

            if (!existingAssociation) {
              try {
                await prisma.propertyValue.create({
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

    logger.info('Migration completed successfully', {
      eventsProcessed: events.length,
      suggestedValuesCreated: createdCount,
      associationsCreated: associationCount
    });

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