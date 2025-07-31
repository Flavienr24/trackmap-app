import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

// Simple test to avoid "no tests" error
describe('Setup', () => {
  test('should load test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

export {};