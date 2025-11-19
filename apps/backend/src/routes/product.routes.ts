import { Router } from 'express';
import { z } from 'zod';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadSingleImage } from '../middleware/upload.js';

const router = Router();
const productController = new ProductController();

// Validation schemas
const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1, 'SKU is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    categoryId: z.string().min(1, 'Category is required'),
    basePrice: z.number().min(0, 'Price must be positive'),
    compareAtPrice: z.number().optional(),
    cost: z.number().optional(),
    quantity: z.number().int().min(0).optional(),
    lowStockAlert: z.number().int().min(0).optional(),
    trackInventory: z.boolean().optional(),
    allowBackorder: z.boolean().optional(),
    weight: z.number().optional(),
    weightUnit: z.string().optional(),
    dimensions: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    images: z.array(z.object({
      url: z.string().url(),
      altText: z.string().optional(),
    })).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    sku: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    categoryId: z.string().optional(),
    basePrice: z.number().min(0).optional(),
    compareAtPrice: z.number().optional(),
    cost: z.number().optional(),
    quantity: z.number().int().min(0).optional(),
    lowStockAlert: z.number().int().min(0).optional(),
    trackInventory: z.boolean().optional(),
    allowBackorder: z.boolean().optional(),
    weight: z.number().optional(),
    weightUnit: z.string().optional(),
    dimensions: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    images: z.array(z.object({
      url: z.string().url(),
      altText: z.string().optional(),
    })).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK']).optional(),
  }),
});

const bulkInventorySchema = z.object({
  body: z.object({
    updates: z.array(z.object({
      id: z.string(),
      quantity: z.number().int().min(0),
    })),
  }),
});

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Routes
router.get('/', asyncHandler(productController.getProducts.bind(productController)));
router.get('/:id', asyncHandler(productController.getProduct.bind(productController)));
router.post(
  '/',
  validate(createProductSchema),
  asyncHandler(productController.createProduct.bind(productController))
);
router.put(
  '/:id',
  validate(updateProductSchema),
  asyncHandler(productController.updateProduct.bind(productController))
);
router.delete('/:id', asyncHandler(productController.deleteProduct.bind(productController)));
router.post(
  '/bulk/inventory',
  validate(bulkInventorySchema),
  asyncHandler(productController.bulkUpdateInventory.bind(productController))
);

/**
 * @route POST /api/products/:id/images
 * @desc Upload a product image
 * @access Private (SUPER_ADMIN only)
 * @param {string} id - Product ID
 * @body {File} image - Image file (multipart/form-data)
 * @returns {Object} { success: true, message, data: ProductImage }
 */
router.post(
  '/:id/images',
  uploadSingleImage,
  asyncHandler(productController.uploadImage.bind(productController))
);

/**
 * @route DELETE /api/products/:id/images/:imageId
 * @desc Delete a product image
 * @access Private (SUPER_ADMIN only)
 * @param {string} id - Product ID
 * @param {string} imageId - Image ID
 * @returns {Object} { success: true, message }
 */
router.delete(
  '/:id/images/:imageId',
  asyncHandler(productController.deleteImage.bind(productController))
);

/**
 * @route PATCH /api/products/:id/images/:imageId/primary
 * @desc Set an image as the primary product image
 * @access Private (SUPER_ADMIN only)
 * @param {string} id - Product ID
 * @param {string} imageId - Image ID
 * @returns {Object} { success: true, message, data: ProductImage }
 */
router.patch(
  '/:id/images/:imageId/primary',
  asyncHandler(productController.setPrimaryImage.bind(productController))
);

export default router;
