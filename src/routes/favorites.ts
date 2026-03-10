import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { FavoriteAlbumModel } from '@/models/FavoriteAlbum';
import { authenticateToken } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * GET /api/favorites/:userId
 * Get user's favorite albums
 */
router.get('/:userId', [
  param('userId').isUUID().withMessage('Invalid user ID')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { userId } = req.params;
  const favorites = await FavoriteAlbumModel.getUserFavorites(userId);

  const response: ApiResponse = {
    success: true,
    data: { favorites },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}));

/**
 * POST /api/favorites
 * Add album to favorites
 */
router.post('/', authenticateToken, [
  body('albumId').isUUID().withMessage('Invalid album ID'),
  body('rank').optional().isInt({ min: 1 }).withMessage('Rank must be a positive integer')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const userId = (req as any).user.id;
  const { albumId, rank } = req.body;

  // If no rank provided, get next available rank
  const finalRank = rank || await FavoriteAlbumModel.getNextRank(userId);

  const favorite = await FavoriteAlbumModel.addFavorite(userId, albumId, finalRank);

  const response: ApiResponse = {
    success: true,
    data: { favorite },
    timestamp: new Date().toISOString()
  };

  res.status(201).json(response);
}));

/**
 * DELETE /api/favorites/:albumId
 * Remove album from favorites
 */
router.delete('/:albumId', authenticateToken, [
  param('albumId').isUUID().withMessage('Invalid album ID')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const userId = (req as any).user.id;
  const { albumId } = req.params;

  const removed = await FavoriteAlbumModel.removeFavorite(userId, albumId);

  if (!removed) {
    throw createError('Favorite not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: { message: 'Album removed from favorites' },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}));

/**
 * PUT /api/favorites/reorder
 * Reorder favorite albums
 */
router.put('/reorder', authenticateToken, [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.albumId').isUUID().withMessage('Invalid album ID'),
  body('updates.*.rank').isInt({ min: 1 }).withMessage('Rank must be a positive integer')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const userId = (req as any).user.id;
  const { updates } = req.body;

  await FavoriteAlbumModel.updateRanks(userId, updates);

  const response: ApiResponse = {
    success: true,
    data: { message: 'Favorites reordered successfully' },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}));

export default router;
