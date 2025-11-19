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
/**
 * @route GET /api/orders
 * @desc Get all orders with pagination, search, and filters
 * @access Private (SUPER_ADMIN only)
 * @queryparams {number} page - Page number (default: 1)
 * @queryparams {number} pageSize - Items per page (default: 20)
 * @queryparams {string} search - Search by order number, customer name/email, company name
 * @queryparams {string} status - Filter by order status (DRAFT, PENDING_APPROVAL, APPROVED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED)
 * @queryparams {string} paymentStatus - Filter by payment status (PENDING, AUTHORIZED, PAID, PARTIALLY_PAID, FAILED, REFUNDED)
 * @queryparams {string} companyId - Filter by company ID
 * @queryparams {string} sortBy - Sort field (default: createdAt)
 * @queryparams {string} sortOrder - Sort order: asc or desc (default: desc)
 * @returns {Object} { success, data: Order[], pagination: { page, pageSize, total, totalPages } }
 */
router.get(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(orderController.getOrders.bind(orderController))
);

/**
 * @route GET /api/orders/:id
 * @desc Get single order details with items, addresses, and relationships
 * @access Private (Authenticated)
 * @params {string} id - Order ID
 * @returns {Object} { success, data: Order }
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(orderController.getOrder.bind(orderController))
);

/**
 * @route PATCH /api/orders/:id/status
 * @desc Update order status and/or payment status
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Order ID
 * @body {string} status - New order status (optional)
 * @body {string} paymentStatus - New payment status (optional)
 * @returns {Object} { success, data: Order, message }
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateOrderStatusSchema),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

/**
 * @route POST /api/orders
 * @desc Create new order with auto-generated order number
 * @access Private (Authenticated)
 * @body {string} userId - User ID
 * @body {string} companyId - Company ID
 * @body {string} billingAddressId - Billing address ID
 * @body {string} shippingAddressId - Shipping address ID
 * @body {number} subtotal - Subtotal amount
 * @body {number} taxAmount - Tax amount (optional)
 * @body {number} shippingAmount - Shipping amount (optional)
 * @body {number} discountAmount - Discount amount (optional)
 * @body {number} total - Total amount
 * @body {string} notes - Order notes (optional)
 * @body {Array} items - Array of order items with productId, sku, name, quantity, unitPrice, totalPrice
 * @returns {Object} { success, data: Order, message }
 */
router.post(
  '/',
  authenticate,
  validateRequest(createOrderSchema),
  asyncHandler(orderController.createOrder.bind(orderController))
);

/**
 * @route PUT /api/orders/:id
 * @desc Update order (only draft orders can be updated)
 * @access Private (Authenticated)
 * @params {string} id - Order ID
 * @body {number} subtotal - Subtotal amount (optional)
 * @body {number} taxAmount - Tax amount (optional)
 * @body {number} shippingAmount - Shipping amount (optional)
 * @body {number} discountAmount - Discount amount (optional)
 * @body {number} total - Total amount (optional)
 * @body {string} notes - Order notes (optional)
 * @returns {Object} { success, data: Order, message }
 */
router.put(
  '/:id',
  authenticate,
  validateRequest(updateOrderSchema),
  asyncHandler(orderController.updateOrder.bind(orderController))
);

/**
 * @route DELETE /api/orders/:id
 * @desc Delete order (only draft orders can be deleted)
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Order ID
 * @returns {Object} { success, message }
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(orderController.deleteOrder.bind(orderController))
);

export default router;
