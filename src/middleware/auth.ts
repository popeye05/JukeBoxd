import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { UserProfile } from '@/types';
import { createError } from '@/middleware/errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * Authentication middleware that validates JWT tokens
 * Adds user profile to request object if token is valid
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw createError('Authorization header required', 401);
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw createError('Token required', 401);
    }

    // Validate token and get user profile
    const userProfile = await AuthService.validateToken(token);
    
    // Add user to request object
    req.user = userProfile;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        try {
          const userProfile = await AuthService.validateToken(token);
          req.user = userProfile;
        } catch (error) {
          // Ignore token validation errors for optional auth
          console.warn('Optional auth token validation failed:', error);
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const error = createError('Authentication required', 401);
    return next(error);
  }
  
  next();
};

/**
 * Middleware to check if user owns a resource
 * Compares req.user.id with req.params.userId or req.body.userId
 */
export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const error = createError('Authentication required', 401);
    return next(error);
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    const error = createError('User ID required', 400);
    return next(error);
  }

  if (req.user.id !== resourceUserId) {
    const error = createError('Access denied: insufficient permissions', 403);
    return next(error);
  }

  next();
};

/**
 * Extract user ID from request (authenticated user)
 */
export const getCurrentUserId = (req: Request): string => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }
  return req.user.id;
};

/**
 * Extract user profile from request (authenticated user)
 */
export const getCurrentUser = (req: Request): UserProfile => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }
  return req.user;
};