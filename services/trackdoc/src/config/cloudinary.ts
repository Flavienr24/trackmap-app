import { v2 as cloudinary } from 'cloudinary';
import logger from './logger';

/**
 * Cloudinary configuration service
 * Handles initialization and configuration of Cloudinary SDK
 */

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

// Validate configuration
const validateCloudinaryConfig = (): boolean => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    logger.error('Missing Cloudinary configuration. Please set environment variables:', {
      missing: [
        !cloud_name && 'CLOUDINARY_CLOUD_NAME',
        !api_key && 'CLOUDINARY_API_KEY', 
        !api_secret && 'CLOUDINARY_API_SECRET'
      ].filter(Boolean)
    });
    return false;
  }
  
  logger.info('Cloudinary configuration validated successfully', {
    cloud_name: cloud_name
  });
  
  return true;
};

// Initialize configuration validation
const isConfigured = validateCloudinaryConfig();

export { cloudinary, isConfigured };
export default cloudinary;