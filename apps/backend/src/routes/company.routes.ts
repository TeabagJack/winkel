import { Router } from 'express';
import { z } from 'zod';
import { CompanyController } from '../controllers/company.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();
const companyController = new CompanyController();

// Validation schemas
const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Company name is required'),
    legalName: z.string().optional(),
    taxId: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    website: z.string().url().optional().or(z.literal('')),
    paymentTerms: z.enum(['NET_30', 'NET_60', 'NET_90', 'IMMEDIATE']).optional(),
    creditLimit: z.number().nonnegative().optional(),
    pricingTierId: z.string().optional(),
  }),
});

const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    legalName: z.string().optional(),
    taxId: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    website: z.string().url().optional().or(z.literal('')),
    paymentTerms: z.enum(['NET_30', 'NET_60', 'NET_90', 'IMMEDIATE']).optional(),
    creditLimit: z.number().nonnegative().optional(),
    pricingTierId: z.string().optional(),
  }),
});

const updateCompanyStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'INACTIVE']),
  }),
});

const updateCreditLimitSchema = z.object({
  body: z.object({
    creditLimit: z.number().nonnegative('Credit limit must be non-negative'),
  }),
});

// Routes
/**
 * @route GET /api/companies
 * @desc Get all companies with pagination, search, and filters
 * @access Private (SUPER_ADMIN only)
 * @queryparams {number} page - Page number (default: 1)
 * @queryparams {number} pageSize - Items per page (default: 20)
 * @queryparams {string} search - Search by name, legal name, email, tax ID
 * @queryparams {string} status - Filter by status (ACTIVE, SUSPENDED, PENDING_APPROVAL, INACTIVE)
 * @queryparams {string} sortBy - Sort field (default: createdAt)
 * @queryparams {string} sortOrder - Sort order: asc or desc (default: desc)
 * @returns {Object} { success, data: Company[], pagination: { page, pageSize, total, totalPages } }
 */
router.get(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(companyController.getCompanies.bind(companyController))
);

/**
 * @route GET /api/companies/:id
 * @desc Get single company with users, addresses, orders, and pricing tier
 * @access Private (Authenticated)
 * @params {string} id - Company ID
 * @returns {Object} { success, data: Company }
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(companyController.getCompany.bind(companyController))
);

/**
 * @route POST /api/companies
 * @desc Create new B2B customer company
 * @access Private (SUPER_ADMIN only)
 * @body {string} name - Company name (required)
 * @body {string} legalName - Legal name (optional)
 * @body {string} taxId - Tax ID (optional, must be unique)
 * @body {string} email - Email address (required)
 * @body {string} phone - Phone number (required)
 * @body {string} website - Website URL (optional)
 * @body {string} paymentTerms - Payment terms: NET_30, NET_60, NET_90, IMMEDIATE (default: NET_30)
 * @body {number} creditLimit - Credit limit (default: 0)
 * @body {string} pricingTierId - Pricing tier ID (optional)
 * @returns {Object} { success, data: Company, message }
 */
router.post(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(createCompanySchema),
  asyncHandler(companyController.createCompany.bind(companyController))
);

/**
 * @route PUT /api/companies/:id
 * @desc Update company information
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Company ID
 * @body {string} name - Company name (optional)
 * @body {string} legalName - Legal name (optional)
 * @body {string} taxId - Tax ID (optional, must be unique)
 * @body {string} email - Email address (optional)
 * @body {string} phone - Phone number (optional)
 * @body {string} website - Website URL (optional)
 * @body {string} paymentTerms - Payment terms (optional)
 * @body {number} creditLimit - Credit limit (optional)
 * @body {string} pricingTierId - Pricing tier ID (optional)
 * @returns {Object} { success, data: Company, message }
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCompanySchema),
  asyncHandler(companyController.updateCompany.bind(companyController))
);

/**
 * @route PATCH /api/companies/:id/status
 * @desc Update company status
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Company ID
 * @body {string} status - New status: ACTIVE, SUSPENDED, PENDING_APPROVAL, INACTIVE
 * @returns {Object} { success, data: Company, message }
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCompanyStatusSchema),
  asyncHandler(companyController.updateCompanyStatus.bind(companyController))
);

/**
 * @route PATCH /api/companies/:id/credit-limit
 * @desc Update company credit limit (preserves used credit amount)
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Company ID
 * @body {number} creditLimit - New credit limit
 * @returns {Object} { success, data: Company, message }
 */
router.patch(
  '/:id/credit-limit',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCreditLimitSchema),
  asyncHandler(companyController.updateCreditLimit.bind(companyController))
);

/**
 * @route DELETE /api/companies/:id
 * @desc Delete company (only if no users or orders exist)
 * @access Private (SUPER_ADMIN only)
 * @params {string} id - Company ID
 * @returns {Object} { success, message }
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(companyController.deleteCompany.bind(companyController))
);

export default router;
