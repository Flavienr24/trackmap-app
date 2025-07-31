import { validateEmail, validateEnvironment, validateUUID } from '../utils/validation';
import { sanitizeObject, generateRequestId } from '../utils/helpers';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validateEnvironment', () => {
    test('should return true for valid environments', () => {
      expect(validateEnvironment('dev')).toBe(true);
      expect(validateEnvironment('staging')).toBe(true);
      expect(validateEnvironment('prod')).toBe(true);
    });

    test('should return false for invalid environments', () => {
      expect(validateEnvironment('development')).toBe(false);
      expect(validateEnvironment('production')).toBe(false);
      expect(validateEnvironment('test')).toBe(false);
    });
  });

  describe('validateUUID', () => {
    test('should return true for valid UUID', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('should return false for invalid UUID', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('123')).toBe(false);
    });
  });
});

describe('Helper Utils', () => {
  describe('sanitizeObject', () => {
    test('should remove undefined, null and empty string values', () => {
      const input = {
        name: 'test',
        description: '',
        value: null,
        count: undefined,
        active: false,
        items: []
      };

      const result = sanitizeObject(input);

      expect(result).toEqual({
        name: 'test',
        active: false,
        items: []
      });
    });
  });

  describe('generateRequestId', () => {
    test('should generate a string', () => {
      const id = generateRequestId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });
  });
});