import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { isBlacklisted } from '../utils/redis.js';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    if (await isBlacklisted(token)) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user info to request
    req.user = payload;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Fetch user from database to get current role
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true, status: true },
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (user.status !== 'ACTIVE') {
        res.status(403).json({ error: 'Account is not active' });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
