import React, { useState } from 'react';
import { Box, Rating as MuiRating, Typography, Button, Alert } from '@mui/material';
import { Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ratingService } from '../../services/ratingService';
import { Rating } from '../../types';

interface StarRatingProps {
  albumId: string;
  currentRating?: Rating | null;
  onRatingChange?: (rating: Rating | null) => void;
  averageRating?: number;
  totalRatings?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  albumId,
  currentRating,
  onRatingChange,
  averageRating = 0,
  totalRatings = 0,
}) => {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number>(currentRating?.rating || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingChange = async (newValue: number | null) => {
    if (!user) {
      setError('Please log in to rate albums');
      return;
    }

    if (newValue === null || newValue < 1 || newValue > 5) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rating = await ratingService.rateAlbum(albumId, newValue);
      setUserRating(newValue);
      onRatingChange?.(rating);
    } catch (err: any) {
      console.error('Error rating album:', err);
      setError(err.response?.data?.error?.message || 'Failed to save rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!user || !currentRating) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ratingService.deleteRating(currentRating.id);
      setUserRating(0);
      onRatingChange?.(null);
    } catch (err: any) {
      console.error('Error deleting rating:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rating
        </Typography>
        
        {totalRatings > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <MuiRating 
              value={averageRating} 
              precision={0.1} 
              readOnly 
              size="large"
              icon={<StarIcon fontSize="inherit" />}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
            />
            <Typography variant="body1">
              {averageRating.toFixed(1)} ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No ratings yet
          </Typography>
        )}
        
        <Alert severity="info">
          Please log in to rate this album
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Rating
      </Typography>
      
      {/* Community Rating */}
      {totalRatings > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Community Rating
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MuiRating 
              value={averageRating} 
              precision={0.1} 
              readOnly 
              size="medium"
              icon={<StarIcon fontSize="inherit" />}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
            />
            <Typography variant="body2">
              {averageRating.toFixed(1)} ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
            </Typography>
          </Box>
        </Box>
      )}

      {/* User Rating */}
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Your Rating
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <MuiRating
            value={userRating}
            onChange={(_, newValue) => handleRatingChange(newValue)}
            disabled={loading}
            size="large"
            icon={<StarIcon fontSize="inherit" />}
            emptyIcon={<StarBorderIcon fontSize="inherit" />}
          />
          
          {userRating > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={handleDeleteRating}
              disabled={loading}
              color="error"
            >
              Remove
            </Button>
          )}
        </Box>

        {userRating > 0 && (
          <Typography variant="body2" color="text.secondary">
            You rated this album {userRating} star{userRating !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};