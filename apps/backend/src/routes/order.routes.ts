import { Router } from 'express';
import { z } from 'zod';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();
const orderController = new OrderController();

// Validation schemas
const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z
      .enum([
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'RETURNED',
      ])
      .optional(),
    paymentStatus: z
      .enum(['PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'])
      .optional(),
  }),
});

const createOrderSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    companyId: z.string().min(1, 'Company ID is required'),
    billingAddressId: z.string().min(1, 'Billing address is required'),
    shippingAddressId: z.string().min(1, 'Shipping address is required'),
    subtotal: z.number().positive('Subtotal must be positive'),
    taxAmount: z.number().nonnegative().optional(),
    shippingAmount: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    total: z.number().positive('Total must be positive'),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Product ID is required'),
          sku: z.string().min(1, 'SKU is required'),
          name: z.string().min(1, 'Product name is required'),
          quantity: z.number().int().positive('Quantity must be positive'),
          unitPrice: z.number().positive('Unit price must be positive'),
          totalPrice: z.number().positive('Total price must be positive'),
        })
      )
      .min(1, 'At least one item is required'),
  }),
});

const updateOrderSchema = z.object({
  body: z.object({
    subtotal: z.number().positive().optional(),
    taxAmount: z.number().nonnegative().optional(),
    shippingAmount: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    total: z.number().positive().optional(),
    notes: z.string().optional(),
  }),
});

// Routes
// Get all orders (Admin only)
router.get(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(orderController.getOrders.bind(orderController))
);

// Get single order
router.get(
  '/:id',
  authenticate,
  asyncHandler(orderController.getOrder.bind(orderController))
);

// Update order status (Admin only)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateOrderStatusSchema),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

// Create order
router.post(
  '/',
  authenticate,
  validateRequest(createOrderSchema),
  asyncHandler(orderController.createOrder.bind(orderController))
);

// Update order (only draft orders)
router.put(
  '/:id',
  authenticate,
  validateRequest(updateOrderSchema),
  asyncHandler(orderController.updateOrder.bind(orderController))
);

// Delete order (Admin only, only draft orders)
router.delete(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(orderController.deleteOrder.bind(orderController))
);

export default router;
