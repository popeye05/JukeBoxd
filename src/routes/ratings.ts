import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { RatingService } from '@/services/RatingService';
import { AlbumModel } from '@/models/Album';
import { authenticateToken, getCurrentUserId } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * POST /api/ratings
 * Create or update album rating
 */
router.post('/', [
  authenticateToken,
  body('albumId')
    .trim()
    .notEmpty()
    .withMessage('Album ID is required')
    .isUUID()
    .withMessage('Invalid album ID format'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
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

  const { albumId, rating } = req.body;
  const userId = getCurrentUserId(req);

  try {
    // Verify album exists
    const album = await AlbumModel.findById(albumId);
    if (!album) {
      throw createError('Album not found', 404);
    }

    // Create or update rating
    const ratingResult = await RatingService.upsertRating(userId, albumId, rating);

    const response: ApiResponse = {
      success: true,
      data: {
        rating: ratingResult,
        message: 'Rating saved successfully'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/ratings/user/:userId
 * Get user's ratings
 */
router.get('/user/:userId', [
  param('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
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

  try {
    // Get user ratings with album details
    const ratings = await RatingService.getUserRatingsWithDetails(userId!);

    const response: ApiResponse = {
      success: true,
      data: {
        ratings,
        userId,
        total: ratings.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * DELETE /api/ratings/:ratingId
 * Delete rating
 */
router.delete('/:ratingId', [
  authenticateToken,
  param('ratingId')
    .trim()
    .notEmpty()
    .withMessage('Rating ID is required')
    .isUUID()
    .withMessage('Invalid rating ID format')
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

  const { ratingId } = req.params;
  const userId = getCurrentUserId(req);

  try {
    // First, get the rating to verify ownership
    const existingRating = await RatingService.getUserRating(userId, ''); // We need to find by rating ID
    
    // For security, we need to verify the rating belongs to the authenticated user
    // Let's get the rating by ID first to check ownership
    const ratings = await RatingService.getUserRatings(userId);
    const userRating = ratings.find(r => r.id === ratingId);
    
    if (!userRating) {
      throw createError('Rating not found or access denied', 404);
    }

    // Delete the rating
    const deleted = await RatingService.deleteRating(ratingId!);
    
    if (!deleted) {
      throw createError('Failed to delete rating', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Rating deleted successfully',
        ratingId
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

export default router;