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
// Get all companies (Admin only)
router.get(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(companyController.getCompanies.bind(companyController))
);

// Get single company
router.get(
  '/:id',
  authenticate,
  asyncHandler(companyController.getCompany.bind(companyController))
);

// Create company (Admin only)
router.post(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(createCompanySchema),
  asyncHandler(companyController.createCompany.bind(companyController))
);

// Update company (Admin only)
router.put(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCompanySchema),
  asyncHandler(companyController.updateCompany.bind(companyController))
);

// Update company status (Admin only)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCompanyStatusSchema),
  asyncHandler(companyController.updateCompanyStatus.bind(companyController))
);

// Update credit limit (Admin only)
router.patch(
  '/:id/credit-limit',
  authenticate,
  authorize(['SUPER_ADMIN']),
  validateRequest(updateCreditLimitSchema),
  asyncHandler(companyController.updateCreditLimit.bind(companyController))
);

// Delete company (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(['SUPER_ADMIN']),
  asyncHandler(companyController.deleteCompany.bind(companyController))
);

export default router;
