import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const authController = new AuthController();

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    phone: z.string().optional(),
  }),
});

// Wrap async controllers to handle errors
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/login', validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/register', validate(registerSchema), asyncHandler(authController.register.bind(authController)));
router.post('/refresh', asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));
router.get('/me', authenticate, asyncHandler(authController.me.bind(authController)));

export default router;
