import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { uploadConfig } from '../config/upload.js';
import { logger } from './logger.js';

export interface ProcessedImage {
  filename: string;
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  width: number;
  height: number;
  path: string;
  url: string;
  fileSize: number;
}

export class ImageProcessor {
  /**
   * Process and resize image to multiple sizes
   */
  static async processImage(
    filePath: string,
    filename: string
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    try {
      // Ensure upload directory exists
      await fs.mkdir(uploadConfig.uploadDir, { recursive: true });

      // Get original image metadata
      const metadata = await sharp(filePath).metadata();

      // Process original (optimize only)
      const originalPath = path.join(uploadConfig.uploadDir, filename);
      await sharp(filePath)
        .jpeg({ quality: uploadConfig.jpegQuality })
        .png({ compressionLevel: uploadConfig.pngCompressionLevel })
        .webp({ quality: uploadConfig.webpQuality })
        .toFile(originalPath);

      const originalStats = await fs.stat(originalPath);
      results.push({
        filename,
        size: 'original',
        width: metadata.width || 0,
        height: metadata.height || 0,
        path: originalPath,
        url: `/uploads/${filename}`,
        fileSize: originalStats.size,
      });

      // Generate resized versions
      for (const [sizeName, dimensions] of Object.entries(uploadConfig.imageSizes)) {
        const sizedFilename = `${baseName}-${sizeName}${ext}`;
        const sizedPath = path.join(uploadConfig.uploadDir, sizedFilename);

        await sharp(filePath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: uploadConfig.jpegQuality })
          .png({ compressionLevel: uploadConfig.pngCompressionLevel })
          .webp({ quality: uploadConfig.webpQuality })
          .toFile(sizedPath);

        const stats = await fs.stat(sizedPath);
        results.push({
          filename: sizedFilename,
          size: sizeName as 'thumbnail' | 'small' | 'medium' | 'large',
          width: dimensions.width,
          height: dimensions.height,
          path: sizedPath,
          url: `/uploads/${sizedFilename}`,
          fileSize: stats.size,
        });
      }

      // Delete original uploaded file (we have the optimized version)
      if (filePath !== originalPath) {
        await fs.unlink(filePath);
      }

      logger.info(`Processed image: ${filename} into ${results.length} sizes`);
      return results;
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Delete image file and all its sizes
   */
  static async deleteImage(filename: string): Promise<void> {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    try {
      // Delete original
      const originalPath = path.join(uploadConfig.uploadDir, filename);
      await fs.unlink(originalPath).catch(() => {});

      // Delete all sizes
      for (const sizeName of Object.keys(uploadConfig.imageSizes)) {
        const sizedFilename = `${baseName}-${sizeName}${ext}`;
        const sizedPath = path.join(uploadConfig.uploadDir, sizedFilename);
        await fs.unlink(sizedPath).catch(() => {});
      }

      logger.info(`Deleted image: ${filename} and all its sizes`);
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Validate if file is an allowed image type
   */
  static isValidImageType(mimetype: string): boolean {
    return uploadConfig.allowedMimeTypes.includes(mimetype);
  }

  /**
   * Validate if file size is within limit
   */
  static isValidFileSize(size: number): boolean {
    return size <= uploadConfig.maxFileSize;
  }
}
