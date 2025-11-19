import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadConfig } from '../config/upload.js';
import { ImageProcessor } from '../utils/image-processor.js';
import { AppError } from './error-handler.js';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadConfig.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ImageProcessor.isValidImageType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        `Invalid file type. Allowed types: ${uploadConfig.allowedMimeTypes.join(', ')}`
      )
    );
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadConfig.maxFileSize,
  },
});

// Single image upload
export const uploadSingleImage = upload.single('image');

// Multiple images upload (max 10)
export const uploadMultipleImages = upload.array('images', 10);
