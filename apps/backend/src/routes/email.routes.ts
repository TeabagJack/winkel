import { Router } from 'express';
import { z } from 'zod';
import { EmailController } from '../controllers/email.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const emailController = new EmailController();

// Helper to wrap async functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const updatePreferencesSchema = z.object({
  body: z.object({
    orderConfirmation: z.boolean().optional(),
    orderShipped: z.boolean().optional(),
    orderDelivered: z.boolean().optional(),
    lowStockAlert: z.boolean().optional(),
    promotions: z.boolean().optional(),
    newsletter: z.boolean().optional(),
  }),
});

const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name is required'),
    subject: z.string().min(1, 'Subject is required'),
    htmlBody: z.string().min(1, 'HTML body is required'),
    textBody: z.string().min(1, 'Text body is required'),
    variables: z.any().optional(),
  }),
});

const sendTestEmailSchema = z.object({
  body: z.object({
    templateId: z.string().min(1, 'Template ID is required'),
    to: z.union([z.string().email(), z.array(z.string().email())]),
    variables: z.record(z.any()).optional(),
  }),
});

/**
 * @swagger
 * /api/email/preferences:
 *   get:
 *     summary: Get email preferences
 *     description: Get current user's email notification preferences
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email preferences
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/preferences',
  authenticate,
  asyncHandler(emailController.getPreferences.bind(emailController))
);

/**
 * @swagger
 * /api/email/preferences:
 *   put:
 *     summary: Update email preferences
 *     description: Update current user's email notification preferences
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderConfirmation:
 *                 type: boolean
 *               orderShipped:
 *                 type: boolean
 *               orderDelivered:
 *                 type: boolean
 *               lowStockAlert:
 *                 type: boolean
 *               promotions:
 *                 type: boolean
 *               newsletter:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/preferences',
  authenticate,
  validate(updatePreferencesSchema),
  asyncHandler(emailController.updatePreferences.bind(emailController))
);

/**
 * @swagger
 * /api/email/queue/stats:
 *   get:
 *     summary: Get email queue statistics
 *     description: Get email queue statistics (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/queue/stats',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.getQueueStats.bind(emailController))
);

/**
 * @swagger
 * /api/email/queue:
 *   get:
 *     summary: Get email queue items
 *     description: Get paginated list of email queue items (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SENT, FAILED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: number
 *           default: 20
 *     responses:
 *       200:
 *         description: Queue items
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/queue',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.getQueueItems.bind(emailController))
);

/**
 * @swagger
 * /api/email/queue/process:
 *   post:
 *     summary: Process email queue
 *     description: Manually trigger email queue processing (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue processed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/queue/process',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.processQueue.bind(emailController))
);

/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Get email templates
 *     description: Get all email templates (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/templates',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.getTemplates.bind(emailController))
);

/**
 * @swagger
 * /api/email/templates/{id}:
 *   get:
 *     summary: Get email template
 *     description: Get a single email template (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/templates/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.getTemplate.bind(emailController))
);

/**
 * @swagger
 * /api/email/templates:
 *   post:
 *     summary: Create email template
 *     description: Create a new email template (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject
 *               - htmlBody
 *               - textBody
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               htmlBody:
 *                 type: string
 *               textBody:
 *                 type: string
 *               variables:
 *                 type: object
 *     responses:
 *       201:
 *         description: Template created
 */
router.post(
  '/templates',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createTemplateSchema),
  asyncHandler(emailController.createTemplate.bind(emailController))
);

/**
 * @swagger
 * /api/email/templates/{id}:
 *   put:
 *     summary: Update email template
 *     description: Update an existing email template (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated
 */
router.put(
  '/templates/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.updateTemplate.bind(emailController))
);

/**
 * @swagger
 * /api/email/templates/{id}:
 *   delete:
 *     summary: Delete email template
 *     description: Delete an email template (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 */
router.delete(
  '/templates/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  asyncHandler(emailController.deleteTemplate.bind(emailController))
);

/**
 * @swagger
 * /api/email/test:
 *   post:
 *     summary: Send test email
 *     description: Send a test email using a template (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - to
 *             properties:
 *               templateId:
 *                 type: string
 *               to:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               variables:
 *                 type: object
 *     responses:
 *       200:
 *         description: Test email queued
 */
router.post(
  '/test',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(sendTestEmailSchema),
  asyncHandler(emailController.sendTestEmail.bind(emailController))
);

export default router;
