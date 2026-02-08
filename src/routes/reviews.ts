import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ReviewService } from '@/services/ReviewService';
import { AlbumModel } from '@/models/Album';
import { authenticateToken, getCurrentUserId } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * POST /api/reviews
 * Create album review
 */
router.post('/', [
  authenticateToken,
  body('albumId')
    .trim()
    .notEmpty()
    .withMessage('Album ID is required')
    .isUUID()
    .withMessage('Invalid album ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Review content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Review content must be between 1 and 5000 characters')
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

  const { albumId, content } = req.body;
  const userId = getCurrentUserId(req);

  try {
    // Validate review content using service method
    const validation = ReviewService.validateReviewContent(content);
    if (!validation.isValid) {
      throw createError(validation.error!, 400);
    }

    // Verify album exists
    const album = await AlbumModel.findById(albumId);
    if (!album) {
      throw createError('Album not found', 404);
    }

    // Check if user already has a review for this album
    const existingReview = await ReviewService.getUserReview(userId, albumId);
    if (existingReview) {
      throw createError('You have already reviewed this album. Use PUT to update your review.', 409);
    }

    // Create review
    const review = await ReviewService.createReview(userId, albumId, content);

    const response: ApiResponse = {
      success: true,
      data: {
        review,
        message: 'Review created successfully'
      },
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * PUT /api/reviews/:reviewId
 * Update review
 */
router.put('/:reviewId', [
  authenticateToken,
  param('reviewId')
    .trim()
    .notEmpty()
    .withMessage('Review ID is required')
    .isUUID()
    .withMessage('Invalid review ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Review content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Review content must be between 1 and 5000 characters')
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

  const { reviewId } = req.params;
  const { content } = req.body;
  const userId = getCurrentUserId(req);

  try {
    // Validate review content using service method
    const validation = ReviewService.validateReviewContent(content);
    if (!validation.isValid) {
      throw createError(validation.error!, 400);
    }

    // Get the existing review to verify ownership
    const existingReview = await ReviewService.getReviewById(reviewId!);
    if (!existingReview) {
      throw createError('Review not found', 404);
    }

    // Verify ownership
    if (existingReview.userId !== userId) {
      throw createError('Access denied: You can only update your own reviews', 403);
    }

    // Update review
    const updatedReview = await ReviewService.updateReview(reviewId!, content);

    if (!updatedReview) {
      throw createError('Failed to update review', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        review: updatedReview,
        message: 'Review updated successfully'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * DELETE /api/reviews/:reviewId
 * Delete review
 */
router.delete('/:reviewId', [
  authenticateToken,
  param('reviewId')
    .trim()
    .notEmpty()
    .withMessage('Review ID is required')
    .isUUID()
    .withMessage('Invalid review ID format')
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

  const { reviewId } = req.params;
  const userId = getCurrentUserId(req);

  try {
    // Get the existing review to verify ownership
    const existingReview = await ReviewService.getReviewById(reviewId!);
    if (!existingReview) {
      throw createError('Review not found', 404);
    }

    // Verify ownership
    if (existingReview.userId !== userId) {
      throw createError('Access denied: You can only delete your own reviews', 403);
    }

    // Delete the review
    const deleted = await ReviewService.deleteReview(reviewId!);

    if (!deleted) {
      throw createError('Failed to delete review', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Review deleted successfully',
        reviewId
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/reviews/user/:userId
 * Get user's reviews
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
    // Get user reviews with album details
    const reviews = await ReviewService.getUserReviewsWithDetails(userId!);

    const response: ApiResponse = {
      success: true,
      data: {
        reviews,
        userId,
        total: reviews.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

/**
 * GET /api/reviews/recent
 * Get recent reviews for home page
 */
router.get('/recent', asyncHandler(async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const reviews = await ReviewService.getRecentReviews(limit);

    const response: ApiResponse = {
      success: true,
      data: {
        reviews,
        total: reviews.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}));

export default router;