import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { lastFmService as musicService } from '../services/LastFmService';
import { RatingService } from '@/services/RatingService';
import { ReviewService } from '@/services/ReviewService';
import { AlbumModel } from '@/models/Album';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

const router = Router();

/**
 * GET /api/albums/search
 * Search albums via Last.fm
 */
router.get('/search', [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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

  const { q: query, limit = 20 } = req.query;

  try {
    const albums = await musicService.searchAlbums(query as string, limit as number);

    const response: ApiResponse = {
      success: true,
      data: {
        albums,
        query: query as string,
        limit: limit as number,
        total: albums.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    // Handle specific Last.fm API errors
    if (error.message.includes('Last.fm')) {
      throw createError(error.message, 503);
    }
    throw error;
  }
}));

/**
 * GET /api/albums/:spotifyId
 * Get album details by Last.fm ID (keeping spotifyId param name for backward compatibility)
 */
router.get('/:spotifyId', [
  param('spotifyId')
    .trim()
    .notEmpty()
    .withMessage('Last.fm ID is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Invalid Last.fm ID format')
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

  const { spotifyId } = req.params;

  try {
    // First try to get from our database
    let album = await AlbumModel.findBySpotifyId(spotifyId!);
    
    // If not in our database, get from Last.fm and save it
    if (!album) {
      const lastFmAlbum = await musicService.getAlbum(spotifyId!);
      
      // Save to our database
      album = await AlbumModel.findOrCreate(
        lastFmAlbum.spotifyId,
        lastFmAlbum.name,
        lastFmAlbum.artist,
        lastFmAlbum.releaseDate,
        lastFmAlbum.imageUrl,
        lastFmAlbum.spotifyUrl
      );
    }

    // Get album statistics
    const stats = await RatingService.getAlbumStats(album.id);

    const response: ApiResponse = {
      success: true,
      data: {
        album: {
          ...album,
          averageRating: stats.averageRating,
          ratingCount: stats.ratingCount
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    // Handle specific errors
    if (error.message.includes('not found')) {
      throw createError('Album not found', 404);
    }
    if (error.message.includes('Last.fm')) {
      throw createError(error.message, 503);
    }
    throw error;
  }
}));

/**
 * GET /api/albums/:spotifyId/ratings
 * Get album ratings by Last.fm ID (keeping spotifyId param name for backward compatibility)
 */
router.get('/:spotifyId/ratings', [
  param('spotifyId')
    .trim()
    .notEmpty()
    .withMessage('Last.fm ID is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Invalid Last.fm ID format')
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

  const { spotifyId } = req.params;

  try {
    // First ensure the album exists in our database
    let album = await AlbumModel.findBySpotifyId(spotifyId!);
    
    if (!album) {
      // Try to get from Last.fm and save it
      try {
        const lastFmAlbum = await musicService.getAlbum(spotifyId!);
        album = await AlbumModel.findOrCreate(
          lastFmAlbum.spotifyId,
          lastFmAlbum.name,
          lastFmAlbum.artist,
          lastFmAlbum.releaseDate,
          lastFmAlbum.imageUrl,
          lastFmAlbum.spotifyUrl
        );
      } catch (lastFmError) {
        throw createError('Album not found', 404);
      }
    }

    // Get ratings with user details
    const ratings = await RatingService.getAlbumRatingsWithDetails(album.id);
    const stats = await RatingService.getAlbumStats(album.id);

    const response: ApiResponse = {
      success: true,
      data: {
        ratings,
        statistics: {
          averageRating: stats.averageRating,
          ratingCount: stats.ratingCount
        },
        album: {
          id: album.id,
          spotifyId: album.spotifyId,
          name: album.name,
          artist: album.artist
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw createError('Album not found', 404);
    }
    throw error;
  }
}));

/**
 * GET /api/albums/:spotifyId/reviews
 * Get album reviews by Last.fm ID (keeping spotifyId param name for backward compatibility)
 */
router.get('/:spotifyId/reviews', [
  param('spotifyId')
    .trim()
    .notEmpty()
    .withMessage('Last.fm ID is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Invalid Last.fm ID format')
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

  const { spotifyId } = req.params;

  try {
    // First ensure the album exists in our database
    let album = await AlbumModel.findBySpotifyId(spotifyId!);
    
    if (!album) {
      // Try to get from Last.fm and save it
      try {
        const lastFmAlbum = await musicService.getAlbum(spotifyId!);
        album = await AlbumModel.findOrCreate(
          lastFmAlbum.spotifyId,
          lastFmAlbum.name,
          lastFmAlbum.artist,
          lastFmAlbum.releaseDate,
          lastFmAlbum.imageUrl,
          lastFmAlbum.spotifyUrl
        );
      } catch (lastFmError) {
        throw createError('Album not found', 404);
      }
    }

    // Get reviews with user details (chronological order)
    const reviews = await ReviewService.getAlbumReviewsWithDetails(album.id);
    const reviewCount = await ReviewService.getAlbumReviewCount(album.id);

    const response: ApiResponse = {
      success: true,
      data: {
        reviews,
        statistics: {
          reviewCount
        },
        album: {
          id: album.id,
          spotifyId: album.spotifyId,
          name: album.name,
          artist: album.artist
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw createError('Album not found', 404);
    }
    throw error;
  }
}));

export default router;