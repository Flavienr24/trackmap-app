// Database configuration - centralized Prisma client instance
// Provides a single, reusable database connection across the application
import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Create singleton Prisma client instance
let prisma: PrismaClient;

/**
 * Get the singleton Prisma client instance
 * Creates the client if it doesn't exist, otherwise returns the existing instance
 * @returns PrismaClient instance
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Note: Prisma doesn't support 'error' event in this version
    // Error handling is done through try/catch in operations

    // Set connection timeout
    prisma.$connect()
      .then(() => {
        logger.info('Prisma client initialized and connected');
      })
      .catch((error) => {
        logger.error('Failed to connect to database', { error });
        throw error;
      });
  }

  return prisma;
};

// Export the client instance
export const db = getPrismaClient();

// Graceful shutdown handler with timeout
export const disconnectDatabase = async (timeoutMs: number = 5000): Promise<void> => {
  if (prisma) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database disconnect timeout')), timeoutMs);
      });

      // Race between disconnect and timeout
      await Promise.race([
        prisma.$disconnect(),
        timeoutPromise
      ]);

      logger.info('Database disconnected gracefully');
    } catch (error) {
      logger.error('Error during database disconnect', { error });
      // Force disconnect on timeout or error
      try {
        await prisma.$disconnect();
      } catch (forceError) {
        logger.error('Force disconnect also failed', { error: forceError });
      }
    } finally {
      // Clear the reference to allow garbage collection
      prisma = undefined as any;
    }
  }
};

// Health check function to verify database connection
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!prisma) {
      return false;
    }
    
    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
};