import { Router } from 'express';
import { z } from 'zod';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const categoryController = new CategoryController();

// Validation schemas
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
    description: z.string().optional(),
    image: z.string().url().optional(),
    parentId: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens').optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    parentId: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public routes (anyone can view categories)
router.get('/', asyncHandler(categoryController.getCategories.bind(categoryController)));
router.get('/:id', asyncHandler(categoryController.getCategory.bind(categoryController)));

// Protected routes (admin only)
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.post(
  '/',
  validate(createCategorySchema),
  asyncHandler(categoryController.createCategory.bind(categoryController))
);
router.put(
  '/:id',
  validate(updateCategorySchema),
  asyncHandler(categoryController.updateCategory.bind(categoryController))
);
router.delete('/:id', asyncHandler(categoryController.deleteCategory.bind(categoryController)));

export default router;
