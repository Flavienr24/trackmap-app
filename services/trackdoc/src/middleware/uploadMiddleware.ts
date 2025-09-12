import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import logger from '../config/logger';

/**
 * Multer middleware configuration for handling file uploads
 * Provides validation and temporary storage for image files before Cloudinary upload
 */

// Allowed file types (images and PDF)
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

// Allowed file extensions
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

// Maximum file size (5MB)
const maxFileSize = 5 * 1024 * 1024;

// Maximum number of files per upload
const maxFiles = 10;

/**
 * File filter function to validate uploaded files
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  logger.debug('Validating uploaded file', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.warn('File rejected: Invalid MIME type', {
      filename: file.originalname,
      mimetype: file.mimetype,
      allowed: allowedMimeTypes
    });
    return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    logger.warn('File rejected: Invalid file extension', {
      filename: file.originalname,
      extension: fileExtension,
      allowed: allowedExtensions
    });
    return cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
  }

  logger.debug('File validation passed', { filename: file.originalname });
  cb(null, true);
};

/**
 * Multer storage configuration
 * Stores files temporarily before uploading to Cloudinary
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use system temp directory
    cb(null, '/tmp');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const filename = `${basename}-${uniqueSuffix}${extension}`;
    
    logger.debug('Generated temporary filename', {
      original: file.originalname,
      generated: filename
    });
    
    cb(null, filename);
  }
});

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: maxFiles
  }
});

/**
 * Middleware for single image upload
 */
export const uploadSingleImage = upload.single('image');

/**
 * Middleware for multiple images upload
 */
export const uploadMultipleImages = upload.array('images', maxFiles);

/**
 * File validation utility function (images and PDF)
 * Lightweight validation for files already processed by multer
 * Only checks business logic constraints that multer doesn't handle
 */
export const validateFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  // Multer already validated file existence, size, and type
  // This function can be extended for additional business logic validation if needed
  return { isValid: true };
};

// Backward compatibility alias
export const validateImageFile = validateFile;

/**
 * Multiple files validation utility function (images and PDF)
 */
export const validateFiles = (files: Express.Multer.File[]): { isValid: boolean; errors: string[] } => {
  if (!files || files.length === 0) {
    return { isValid: false, errors: ['No files provided'] };
  }

  if (files.length > maxFiles) {
    return { 
      isValid: false, 
      errors: [`Too many files. Maximum: ${maxFiles}`] 
    };
  }

  const errors: string[] = [];
  
  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      errors.push(`File ${index + 1} (${file.originalname}): ${validation.error}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Backward compatibility alias
export const validateImageFiles = validateFiles;

// Export configuration constants for reference
export const uploadConfig = {
  allowedMimeTypes,
  allowedExtensions,
  maxFileSize,
  maxFiles
};