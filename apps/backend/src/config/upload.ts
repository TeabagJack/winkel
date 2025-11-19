import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadConfig = {
  // Upload directory (relative to backend root)
  uploadDir: path.join(__dirname, '../../uploads'),

  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,

  // Allowed mime types
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Image sizes to generate
  imageSizes: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
  },

  // JPEG quality
  jpegQuality: 85,

  // PNG compression level
  pngCompressionLevel: 8,

  // WebP quality
  webpQuality: 85,
};
