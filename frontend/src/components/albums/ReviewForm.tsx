import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { reviewService } from '../../services/reviewService';
import { Review } from '../../types';

interface ReviewFormProps {
  albumId: string;
  existingReview?: Review | null;
  onReviewSubmit?: (review: Review) => void;
  onReviewUpdate?: (review: Review) => void;
  onReviewDelete?: (reviewId: string) => void;
  onCancel?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  albumId,
  existingReview,
  onReviewSubmit,
  onReviewUpdate,
  onReviewDelete,
  onCancel,
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(existingReview?.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!existingReview);

  useEffect(() => {
    setContent(existingReview?.content || '');
    setIsEditing(!existingReview);
  }, [existingReview]);

  const validateContent = (text: string): boolean => {
    // Check if content is empty or contains only whitespace
    return text.trim().length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please log in to write reviews');
      return;
    }

    if (!validateContent(content)) {
      setError('Review cannot be empty or contain only whitespace');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingReview) {
        // Update existing review
        const updatedReview = await reviewService.updateReview(existingReview.id, content);
        onReviewUpdate?.(updatedReview);
        setIsEditing(false);
      } else {
        // Create new review
        const newReview = await reviewService.createReview(albumId, content);
        onReviewSubmit?.(newReview);
        setContent('');
      }
    } catch (err: any) {
      console.error('Error saving review:', err);
      setError(err.response?.data?.error?.message || 'Failed to save review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview || !user) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await reviewService.deleteReview(existingReview.id);
      onReviewDelete?.(existingReview.id);
    } catch (err: any) {
      console.error('Error deleting review:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (existingReview) {
      setContent(existingReview.content);
      setIsEditing(false);
    } else {
      setContent('');
    }
    setError(null);
    onCancel?.();
  };

  if (!user) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Please log in to write a review for this album
      </Alert>
    );
  }

  // Display existing review in read-only mode
  if (existingReview && !isEditing) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Your Review
          </Typography>
          <Box>
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              size="small"
              disabled={loading}
            >
              Edit
            </Button>
            <Button
              color="error"
              onClick={handleDelete}
              size="small"
              disabled={loading}
              sx={{ ml: 1 }}
            >
              Delete
            </Button>
          </Box>
        </Box>
        
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
          {existingReview.content}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          {new Date(existingReview.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    );
  }

  // Edit/Create form
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts about this album..."
          disabled={loading}
          error={!!error && !validateContent(content)}
          helperText={
            error && !validateContent(content) 
              ? 'Review cannot be empty or contain only whitespace'
              : 'Write your honest opinion about this album'
          }
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={loading || !validateContent(content)}
          >
            {existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>

        {error && validateContent(content) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};