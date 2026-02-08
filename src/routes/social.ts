import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { SocialService } from '@/services/SocialService';
import { authenticateToken, getCurrentUserId } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * POST /api/social/follow
 * Follow a user
 */
router.post('/follow', [
  authenticateToken,
  body('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const followerId = getCurrentUserId(req);
  const { userId: followeeId } = req.body;

  if (!followeeId) {
    throw createError('User ID to follow is required', 400);
  }

  if (followerId === followeeId) {
    throw createError('Cannot follow yourself', 400);
  }

  try {
    const follow = await SocialService.followUser(followerId, followeeId);

    const response: ApiResponse = {
      success: true,
      data: {
        follow,
        message: 'Successfully followed user'
      },
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * DELETE /api/social/follow/:userId
 * Unfollow a user
 */
router.delete('/follow/:userId', [
  authenticateToken,
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const followerId = getCurrentUserId(req);
  const { userId: followeeId } = req.params;

  if (!followeeId) {
    throw createError('User ID is required', 400);
  }

  if (followerId === followeeId) {
    throw createError('Cannot unfollow yourself', 400);
  }

  try {
    const success = await SocialService.unfollowUser(followerId, followeeId);

    const response: ApiResponse = {
      success: true,
      data: {
        success,
        message: 'Successfully unfollowed user'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/followers/:userId
 * Get user's followers
 */
router.get('/followers/:userId', [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const { userId } = req.params;

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  try {
    const followers = await SocialService.getFollowers(userId);

    const response: ApiResponse = {
      success: true,
      data: {
        followers,
        count: followers.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/following/:userId
 * Get users being followed by a user
 */
router.get('/following/:userId', [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const { userId } = req.params;

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  try {
    const following = await SocialService.getFollowing(userId);

    const response: ApiResponse = {
      success: true,
      data: {
        following,
        count: following.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/profile/:userId
 * Get user profile with social stats
 */
router.get('/profile/:userId', [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const { userId } = req.params;

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  try {
    const profile = await SocialService.getUserProfileWithStats(userId);

    const response: ApiResponse = {
      success: true,
      data: { profile },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/is-following/:userId
 * Check if current user is following another user
 */
router.get('/is-following/:userId', [
  authenticateToken,
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
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

  const followerId = getCurrentUserId(req);
  const { userId: followeeId } = req.params;

  if (!followeeId) {
    throw createError('User ID is required', 400);
  }

  try {
    const isFollowing = await SocialService.isFollowing(followerId, followeeId);

    const response: ApiResponse = {
      success: true,
      data: { isFollowing },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/suggestions
 * Get user suggestions for discovery
 */
router.get('/suggestions', [
  authenticateToken
], asyncHandler(async (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const limit = parseInt(req.query.limit as string) || 10;

  // Validate limit
  if (limit < 1 || limit > 50) {
    throw createError('Limit must be between 1 and 50', 400);
  }

  try {
    const suggestions = await SocialService.getFollowSuggestions(userId, limit);

    const response: ApiResponse = {
      success: true,
      data: {
        suggestions,
        count: suggestions.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/social/search
 * Search users
 */
router.get('/search', [
  authenticateToken
], asyncHandler(async (req: Request, res: Response) => {
  const queryStr = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const users = await SocialService.searchUsers(queryStr, limit);

    const response: ApiResponse = {
      success: true,
      data: { users },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

export default router;