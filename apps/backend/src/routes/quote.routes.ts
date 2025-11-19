import { Router } from 'express';
import { z } from 'zod';
import { QuoteController } from '../controllers/quote.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const quoteController = new QuoteController();

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const createQuoteSchema = z.object({
  body: z.object({
    customerNotes: z.string().optional(),
  }),
});

const addItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    requestedQuantity: z.number().int().positive('Quantity must be positive'),
    notes: z.string().optional(),
  }),
});

const reviewQuoteSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        itemId: z.string().min(1, 'Item ID is required'),
        quotedQuantity: z.number().int().positive('Quantity must be positive'),
        quotedUnitPrice: z.number().positive('Price must be positive'),
      })
    ),
    taxAmount: z.number().nonnegative().optional(),
    shippingAmount: z.number().nonnegative().optional(),
    adminNotes: z.string().optional(),
    validUntil: z.string().optional(), // ISO date string
  }),
});

const rejectQuoteSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/quotes:
 *   post:
 *     summary: Create a new quote
 *     description: Create a new quote request (customer)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerNotes:
 *                 type: string
 *                 description: Optional notes from customer
 *     responses:
 *       201:
 *         description: Quote created successfully
 *       400:
 *         description: Bad request (user not associated with company)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/',
  validate(createQuoteSchema),
  asyncHandler(quoteController.createQuote.bind(quoteController))
);

/**
 * @swagger
 * /api/quotes:
 *   get:
 *     summary: Get all quotes
 *     description: Get all quotes (admin sees all, users see their own)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, QUOTED, ACCEPTED, REJECTED, EXPIRED]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by quote number, customer email, or company name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of quotes with pagination
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', asyncHandler(quoteController.getQuotes.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/statistics:
 *   get:
 *     summary: Get quote statistics
 *     description: Get aggregate statistics for all quotes (SUPER_ADMIN only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quote statistics
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/statistics',
  authorize('SUPER_ADMIN'),
  asyncHandler(quoteController.getStatistics.bind(quoteController))
);

/**
 * @swagger
 * /api/quotes/expire:
 *   post:
 *     summary: Expire outdated quotes
 *     description: Automatically expire quotes past their validUntil date (SUPER_ADMIN only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quotes expired successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/expire',
  authorize('SUPER_ADMIN'),
  asyncHandler(quoteController.expireQuotes.bind(quoteController))
);

/**
 * @swagger
 * /api/quotes/{id}:
 *   get:
 *     summary: Get quote by ID
 *     description: Get detailed quote information including items and history
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.get('/:id', asyncHandler(quoteController.getQuoteById.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/{id}:
 *   delete:
 *     summary: Delete quote
 *     description: Delete a draft quote (only DRAFT quotes can be deleted)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote deleted successfully
 *       400:
 *         description: Cannot delete non-draft quote
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.delete('/:id', asyncHandler(quoteController.deleteQuote.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/{id}/items:
 *   post:
 *     summary: Add item to quote
 *     description: Add or update product item in quote (only for DRAFT quotes)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - requestedQuantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               requestedQuantity:
 *                 type: integer
 *                 description: Requested quantity
 *                 minimum: 1
 *               notes:
 *                 type: string
 *                 description: Optional notes for this item
 *     responses:
 *       200:
 *         description: Item added to quote
 *       400:
 *         description: Bad request or quote not in DRAFT status
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote or product not found
 */
router.post(
  '/:id/items',
  validate(addItemSchema),
  asyncHandler(quoteController.addItem.bind(quoteController))
);

/**
 * @swagger
 * /api/quotes/{id}/items/{itemId}:
 *   delete:
 *     summary: Remove item from quote
 *     description: Remove a product item from quote (only for DRAFT quotes)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote item ID
 *     responses:
 *       200:
 *         description: Item removed from quote
 *       400:
 *         description: Quote not in DRAFT status
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.delete('/:id/items/:itemId', asyncHandler(quoteController.removeItem.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/{id}/submit:
 *   post:
 *     summary: Submit quote for review
 *     description: Submit a draft quote for admin review (changes status from DRAFT to SUBMITTED)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote submitted successfully
 *       400:
 *         description: Quote already submitted or has no items
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.post('/:id/submit', asyncHandler(quoteController.submitQuote.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/{id}/review:
 *   post:
 *     summary: Review quote and provide pricing
 *     description: Admin reviews quote and provides pricing for each item (SUPER_ADMIN only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - quotedQuantity
 *                     - quotedUnitPrice
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quotedQuantity:
 *                       type: integer
 *                       minimum: 1
 *                     quotedUnitPrice:
 *                       type: number
 *                       minimum: 0
 *               taxAmount:
 *                 type: number
 *                 minimum: 0
 *               shippingAmount:
 *                 type: number
 *                 minimum: 0
 *               adminNotes:
 *                 type: string
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 description: Quote validity date (default 30 days)
 *     responses:
 *       200:
 *         description: Quote reviewed and pricing provided
 *       400:
 *         description: Invalid data or quote not in SUBMITTED status
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Quote not found
 */
router.post(
  '/:id/review',
  authorize('SUPER_ADMIN'),
  validate(reviewQuoteSchema),
  asyncHandler(quoteController.reviewQuote.bind(quoteController))
);

/**
 * @swagger
 * /api/quotes/{id}/accept:
 *   post:
 *     summary: Accept quote
 *     description: Customer accepts the quoted pricing (changes status from QUOTED to ACCEPTED)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote accepted
 *       400:
 *         description: Quote not in QUOTED status or expired
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.post('/:id/accept', asyncHandler(quoteController.acceptQuote.bind(quoteController)));

/**
 * @swagger
 * /api/quotes/{id}/reject:
 *   post:
 *     summary: Reject quote
 *     description: Reject a quote (can be done by customer or admin)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for rejection
 *     responses:
 *       200:
 *         description: Quote rejected
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.post(
  '/:id/reject',
  validate(rejectQuoteSchema),
  asyncHandler(quoteController.rejectQuote.bind(quoteController))
);

export default router;
