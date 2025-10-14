// Test environment setup and configuration
// CRITICAL: Load test environment variables BEFORE importing database
// This prevents race condition where Prisma reads DATABASE_URL before .env.test is loaded
import dotenv from 'dotenv';

// Load .env.test FIRST, before any other imports that might use DATABASE_URL
dotenv.config({ path: '.env.test' });

// Import Prisma directly to create a fresh instance after dotenv loaded
import { PrismaClient } from '@prisma/client';

// Create a fresh Prisma instance AFTER dotenv loaded .env.test
// This ensures DATABASE_URL points to test.db
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Now points to file:./prisma/test.db
    },
  },
});

// SAFETY CHECK: Verify we're using test database, not dev database
if (!process.env.DATABASE_URL?.includes('test.db')) {
  throw new Error(
    `🚨 CRITICAL: Tests are trying to use production database!\n` +
    `DATABASE_URL: ${process.env.DATABASE_URL}\n` +
    `Expected: file:./test.db\n` +
    `This would DELETE all production data!\n` +
    `Fix: Ensure .env.test is loaded BEFORE importing database`
  );
}

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();

  // Double-check we're on test.db by querying the connection
  const dbPath = await prisma.$queryRaw<[{ file: string }]>`PRAGMA database_list`;
  if (dbPath[0]?.file && !dbPath[0].file.includes('test.db')) {
    throw new Error(
      `🚨 CRITICAL: Connected to wrong database: ${dbPath[0].file}\n` +
      `Expected path to contain 'test.db'`
    );
  }
});

// Clean database before each test
beforeEach(async () => {
  // Clean all tables in reverse dependency order
  await prisma.eventHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.page.deleteMany();
  await prisma.propertyValue.deleteMany();
  await prisma.property.deleteMany();
  await prisma.suggestedValue.deleteMany();
  await prisma.product.deleteMany();
});

// Global test teardown
afterAll(async () => {
  // Final cleanup
  await prisma.eventHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.page.deleteMany();
  await prisma.propertyValue.deleteMany();
  await prisma.property.deleteMany();
  await prisma.suggestedValue.deleteMany();
  await prisma.product.deleteMany();
  
  // Disconnect from database
  await prisma.$disconnect();
});

// Basic test to ensure test environment is properly configured
describe('Test Environment Setup', () => {
  test('should load test environment configuration', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should connect to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });
});

export { prisma };