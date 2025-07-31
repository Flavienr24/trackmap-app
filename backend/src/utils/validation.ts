// Validation utility functions for common data types
// Used across the application for input validation

/**
 * Validates email format using RFC 5322 compliant regex
 * @param email - Email string to validate
 * @returns true if email format is valid
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates environment string against allowed values
 * Used to ensure only valid environments are accepted
 * @param env - Environment string to validate
 * @returns true if environment is valid (dev, staging, prod)
 */
export const validateEnvironment = (env: string): boolean => {
  const validEnvironments = ['dev', 'staging', 'prod'];
  return validEnvironments.includes(env);
};

/**
 * Validates UUID v4 format using regex
 * Used for validating database record IDs
 * @param uuid - UUID string to validate
 * @returns true if UUID format is valid
 */
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};