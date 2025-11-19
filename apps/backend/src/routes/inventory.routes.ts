import { Router } from 'express';
import { z } from 'zod';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const inventoryController = new InventoryController();

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const recordMovementSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    type: z.enum(['ADJUSTMENT', 'SALE', 'RETURN', 'RESTOCK', 'TRANSFER', 'INITIAL']),
    quantity: z.number().int(),
    reason: z.string().optional(),
  }),
});

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

/**
 * @swagger
 * /api/inventory/alerts:
 *   get:
 *     summary: Get active inventory alerts
 *     description: Get all unresolved inventory alerts with optional filters
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: alertType
 *         schema:
 *           type: string
 *           enum: [LOW_STOCK, OUT_OF_STOCK, REORDER_POINT]
 *         description: Filter by alert type
 *     responses:
 *       200:
 *         description: List of active alerts
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/alerts', asyncHandler(inventoryController.getActiveAlerts.bind(inventoryController)));

/**
 * @swagger
 * /api/inventory/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve an inventory alert
 *     description: Mark an inventory alert as resolved
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/alerts/:id/resolve',
  asyncHandler(inventoryController.resolveAlert.bind(inventoryController))
);

/**
 * @swagger
 * /api/inventory/movements:
 *   post:
 *     summary: Record stock movement
 *     description: Record a stock movement (adjustment, sale, return, restock, transfer)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - type
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ADJUSTMENT, SALE, RETURN, RESTOCK, TRANSFER, INITIAL]
 *               quantity:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock movement recorded
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/movements',
  validate(recordMovementSchema),
  asyncHandler(inventoryController.recordStockMovement.bind(inventoryController))
);

/**
 * @swagger
 * /api/inventory/products/{productId}/history:
 *   get:
 *     summary: Get stock movement history
 *     description: Get stock movement history for a product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Stock movement history
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/products/:productId/history',
  asyncHandler(inventoryController.getStockHistory.bind(inventoryController))
);

/**
 * @swagger
 * /api/inventory/analytics:
 *   get:
 *     summary: Get inventory analytics
 *     description: Get inventory analytics and metrics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory analytics
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/analytics', asyncHandler(inventoryController.getAnalytics.bind(inventoryController)));

/**
 * @swagger
 * /api/inventory/restock-recommendations:
 *   get:
 *     summary: Get restock recommendations
 *     description: Get list of products that need restocking
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Restock recommendations
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/restock-recommendations',
  asyncHandler(inventoryController.getRestockRecommendations.bind(inventoryController))
);

/**
 * @swagger
 * /api/inventory/check:
 *   post:
 *     summary: Run inventory check
 *     description: Manually trigger inventory level check and create alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory check completed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/check', asyncHandler(inventoryController.runInventoryCheck.bind(inventoryController)));

export default router;
