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
    });

    logger.info('Prisma client initialized');
  }

  return prisma;
};

// Export the client instance
export const db = getPrismaClient();

// Graceful shutdown handler
export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }
};