/**
 * Data sanitization utilities for logging
 * Prevents sensitive information from being logged
 */

/**
 * List of sensitive field names to mask in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'credit_card',
  'creditCard',
  'ssn',
  'email', // Can contain PII
  'phone',
  'address'
];

/**
 * Sanitizes an object by masking sensitive fields
 * @param obj - Object to sanitize
 * @param mask - Mask character (default: '***REDACTED***')
 * @returns Sanitized copy of the object
 */
export function sanitizeObject(obj: any, mask: string = '***REDACTED***'): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, mask));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = mask;
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, mask);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes request body for safe logging
 * Use this when you need to log request data for debugging
 * @param body - Request body to sanitize
 * @returns Sanitized copy safe for logging
 */
export function sanitizeRequestBody(body: any): any {
  return sanitizeObject(body);
}

/**
 * Sanitizes headers by removing authorization and API keys
 * @param headers - Request headers
 * @returns Sanitized headers
 */
export function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };

  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '***REDACTED***';
    }
  });

  return sanitized;
}
