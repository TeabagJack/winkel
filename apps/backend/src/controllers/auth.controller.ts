import { Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { addToBlacklist } from '../utils/redis.js';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

export class AuthController {
  async login(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'Account is not active');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send response
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    });
  }

  async refresh(req: AuthRequest, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, 'Refresh token not provided');
    }

    try {
      const payload = verifyRefreshToken(refreshToken);

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });

      res.json({ accessToken });
    } catch (error) {
      throw new AppError(401, 'Invalid refresh token');
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Add token to blacklist (expires in 15 minutes)
      await addToBlacklist(token, 15 * 60);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { company: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        companyId: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  }

  async register(req: AuthRequest, res: Response): Promise<void> {
    const { email, password, firstName, lastName, companyName, phone } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          email,
          phone: phone || '',
          status: 'PENDING_APPROVAL',
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'COMPANY_ADMIN',
          status: 'PENDING',
          companyId: company.id,
        },
      });

      return { user, company };
    });

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    });
  }
}
