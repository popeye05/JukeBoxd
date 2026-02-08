import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '@/services/AuthService';
import { UserModel } from '@/models/User';
import { authenticateToken, getCurrentUser } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], asyncHandler(async (req: Request, res: Response) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError(
      `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`,
      400
    );
    throw error;
  }

  const { username, email, password } = req.body;

  try {
    const authToken = await AuthService.register(username, email, password);

    const response: ApiResponse = {
      success: true,
      data: {
        token: authToken.token,
        user: authToken.user,
        expiresAt: authToken.expiresAt
      },
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * POST /api/auth/login
 * Login user with username/email and password
 */
router.post('/login', [
  body('usernameOrEmail')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req: Request, res: Response) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError(
      `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`,
      400
    );
    throw error;
  }

  const { usernameOrEmail, password } = req.body;

  try {
    const authToken = await AuthService.login(usernameOrEmail, password);

    const response: ApiResponse = {
      success: true,
      data: {
        token: authToken.token,
        user: authToken.user,
        expiresAt: authToken.expiresAt
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * POST /api/auth/logout
 * Logout user by invalidating session
 */
router.post('/logout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    await AuthService.logout(token);
  }

  const response: ApiResponse = {
    success: true,
    data: { message: 'Logged out successfully' },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = getCurrentUser(req);

  const response: ApiResponse = {
    success: true,
    data: { user },
    timestamp: new Date().toISOString()
  };


}));

/**
 * PUT /api/auth/me/profile
 * Update current user profile
 */
router.put('/me/profile', [
  authenticateToken,
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('avatarUrl').optional().trim().isURL().withMessage('Invalid URL format for avatar'),
  body('displayName').optional().trim().isLength({ max: 50 }).withMessage('Display name must be less than 50 characters')
], asyncHandler(async (req: Request, res: Response) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError(
      `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`,
      400
    );
    throw error;
  }

  const user = getCurrentUser(req);
  const { bio, avatarUrl, displayName } = req.body;

  try {
    const updatedUser = await UserModel.update(user.id, { bio, avatarUrl, displayName });

    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: UserModel.toProfile(updatedUser),
        message: 'Profile updated successfully'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * POST /api/auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw createError('Token required', 400);
  }

  try {
    const authToken = await AuthService.refreshToken(token);

    const response: ApiResponse = {
      success: true,
      data: {
        token: authToken.token,
        user: authToken.user,
        expiresAt: authToken.expiresAt
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * DELETE /api/auth/account
 * Delete user account with proper data handling
 */
router.delete('/account', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = getCurrentUser(req);

  try {
    await AuthService.deleteAccount(user.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Account deleted successfully' },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

export default router;