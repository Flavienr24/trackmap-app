// Test environment setup and configuration
// Loads test-specific environment variables and sets up database
import dotenv from 'dotenv';
import { db } from '../config/database';

// Load test environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Use centralized database instance for tests
const prisma = db;

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Clean database before each test
beforeEach(async () => {
  // Clean all tables in reverse dependency order
  await prisma.eventHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.page.deleteMany();
  await prisma.variableValue.deleteMany();
  await prisma.variable.deleteMany();
  await prisma.suggestedValue.deleteMany();
  await prisma.instance.deleteMany();
  await prisma.product.deleteMany();
});

// Global test teardown
afterAll(async () => {
  // Final cleanup
  await prisma.eventHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.page.deleteMany();
  await prisma.variableValue.deleteMany();
  await prisma.variable.deleteMany();
  await prisma.suggestedValue.deleteMany();
  await prisma.instance.deleteMany();
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