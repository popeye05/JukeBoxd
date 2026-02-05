import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { ActivityFeedService } from '@/services/ActivityFeedService';
import { authenticateToken, getCurrentUserId } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * GET /api/feed
 * Get personalized activity feed for authenticated user
 */
router.get('/', [
  authenticateToken,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
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

  const userId = getCurrentUserId(req);
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;
  const offset = parseInt(req.query.offset as string) || (page - 1) * limit;

  try {
    let activities;
    let pagination;

    if (req.query.page) {
      // Use pagination-aware method
      const result = await ActivityFeedService.getFeedWithPagination(userId, page, limit);
      activities = result.activities;
      pagination = result.pagination;
    } else {
      // Use simple offset/limit method
      activities = await ActivityFeedService.getFeed(userId, limit, offset);
      pagination = {
        limit,
        offset,
        hasMore: activities.length === limit
      };
    }

    const response: ApiResponse = {
      success: true,
      data: {
        activities,
        pagination
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/feed/user/:userId
 * Get public activity feed for a specific user
 */
router.get('/user/:userId', [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
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
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;
  const offset = parseInt(req.query.offset as string) || (page - 1) * limit;

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  try {
    let activities;
    let pagination;

    if (req.query.page) {
      // Use pagination-aware method
      const result = await ActivityFeedService.getUserActivitiesWithPagination(userId, page, limit);
      activities = result.activities;
      pagination = result.pagination;
    } else {
      // Use simple offset/limit method
      activities = await ActivityFeedService.getUserFeed(userId, limit, offset);
      pagination = {
        limit,
        offset,
        hasMore: activities.length === limit
      };
    }

    const response: ApiResponse = {
      success: true,
      data: {
        activities,
        pagination,
        userId
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/feed/recent
 * Get recent activities from all users (public discovery feed)
 */
router.get('/recent', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
  query('type')
    .optional()
    .isIn(['rating', 'review'])
    .withMessage('Type must be either "rating" or "review"')
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

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const type = req.query.type as 'rating' | 'review' | undefined;

  try {
    let activities;

    if (type) {
      activities = await ActivityFeedService.getActivitiesByType(type, limit, offset);
    } else {
      activities = await ActivityFeedService.getRecentActivities(limit, offset);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        activities,
        pagination: {
          limit,
          offset,
          hasMore: activities.length === limit,
          type
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/feed/stats/:userId
 * Get activity statistics for a user
 */
router.get('/stats/:userId', [
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
    const [activityCount, hasActivities] = await Promise.all([
      ActivityFeedService.getUserActivityCount(userId),
      ActivityFeedService.hasUserActivities(userId)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        userId,
        activityCount,
        hasActivities
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

export default router;