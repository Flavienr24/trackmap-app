// Test environment setup and configuration
// Loads test-specific environment variables and validates setup
import dotenv from 'dotenv';

// Load test environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Basic test to ensure test environment is properly configured
// Prevents Jest from failing due to "no tests" error
describe('Test Environment Setup', () => {
  test('should load test environment configuration', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

export {};