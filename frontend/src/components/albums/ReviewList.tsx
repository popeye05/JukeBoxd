import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import { Review } from '../../types';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews, currentUserId }) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Filter out current user's review as it's handled separately
  const otherUsersReviews = reviews.filter(review => review.userId !== currentUserId);

  if (otherUsersReviews.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Community Reviews
        </Typography>
        <Alert severity="info">
          No reviews from other users yet. Be the first to share your thoughts!
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Community Reviews ({otherUsersReviews.length})
      </Typography>
      
      <Box>
        {otherUsersReviews.map((review, index) => (
          <Box key={review.id}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {review.user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {review.user?.username || 'Anonymous User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(review.createdAt)}
                  </Typography>
                </Box>
                
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {review.content}
                </Typography>
              </Box>
            </Box>
            
            {index < otherUsersReviews.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};