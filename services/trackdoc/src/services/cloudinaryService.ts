import cloudinary, { isConfigured } from '../config/cloudinary';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

/**
 * Cloudinary service for handling image uploads
 * Provides methods for uploading, deleting and managing screenshots
 */

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: object;
  tags?: string[];
}

export class CloudinaryService {
  private static instance: CloudinaryService;
  private readonly defaultFolder = 'trackmap/screenshots';
  
  private constructor() {
    if (!isConfigured) {
      throw new Error('Cloudinary is not properly configured');
    }
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Upload an image file to Cloudinary
   */
  async uploadImage(
    filePath: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      logger.info('Starting image upload to Cloudinary', { filePath, options });

      const uploadOptions = {
        folder: options.folder || this.defaultFolder,
        resource_type: 'image' as const,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        tags: ['trackmap', 'screenshot', ...(options.tags || [])],
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      
      logger.info('Image uploaded successfully to Cloudinary', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes
      });

      // Clean up local file after successful upload
      this.cleanupLocalFile(filePath);

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at
      };

    } catch (error) {
      logger.error('Error uploading image to Cloudinary', { 
        filePath, 
        error: error instanceof Error ? error.message : error 
      });
      
      // Clean up local file even on error
      this.cleanupLocalFile(filePath);
      
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   */
  async uploadMultipleImages(
    filePaths: string[], 
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    logger.info('Starting multiple images upload to Cloudinary', { count: filePaths.length });

    const uploadPromises = filePaths.map(filePath => 
      this.uploadImage(filePath, options)
    );

    try {
      const results = await Promise.all(uploadPromises);
      logger.info('Multiple images uploaded successfully', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error uploading multiple images', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      logger.info('Deleting image from Cloudinary', { publicId });
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result !== 'ok') {
        throw new Error(`Failed to delete image: ${result.result}`);
      }
      
      logger.info('Image deleted successfully from Cloudinary', { publicId });
    } catch (error) {
      logger.error('Error deleting image from Cloudinary', { 
        publicId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    logger.info('Deleting multiple images from Cloudinary', { count: publicIds.length });

    const deletePromises = publicIds.map(publicId => 
      this.deleteImage(publicId)
    );

    try {
      await Promise.all(deletePromises);
      logger.info('Multiple images deleted successfully', { count: publicIds.length });
    } catch (error) {
      logger.error('Error deleting multiple images', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Generate a transformation URL for an image
   */
  getTransformedUrl(publicId: string, transformations: object): string {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  }

  /**
   * Get optimized thumbnail URL
   */
  getThumbnailUrl(publicId: string, width: number = 300, height: number = 200): string {
    return this.getTransformedUrl(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }

  /**
   * Clean up local file after upload
   */
  private cleanupLocalFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug('Local file cleaned up', { filePath });
      }
    } catch (error) {
      logger.warn('Failed to cleanup local file', { 
        filePath, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }
}

// Export singleton instance
export const cloudinaryService = CloudinaryService.getInstance();