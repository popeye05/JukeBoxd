import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
import { Album, Rating, Review } from '../../types';
import { albumService } from '../../services/albumService';
import { useAuth } from '../../contexts/AuthContext';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';

interface AlbumDetailProps {
  album: Album;
  onClose?: () => void;
}

export const AlbumDetail: React.FC<AlbumDetailProps> = ({ album, onClose }) => {
  const { user } = useAuth();
  const [albumData, setAlbumData] = useState<Album | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlbumData = async () => {
      setLoading(true);
      setError(null);

      try {
        // First, ensure the album exists in our database by fetching it
        // This will create the album in our database if it doesn't exist
        const fetchedAlbum = await albumService.getAlbum(album.spotifyId);
        setAlbumData(fetchedAlbum);
        
        // Now fetch ratings and reviews using the Last.fm ID (backend handles the mapping)
        const [ratingsData, reviewsData] = await Promise.all([
          albumService.getAlbumRatings(album.spotifyId),
          albumService.getAlbumReviews(album.spotifyId),
        ]);

        setRatings(ratingsData);
        setReviews(reviewsData);

        // Find current user's rating and review
        if (user) {
          const currentUserRating = ratingsData.find(r => r.userId === user.id);
          const currentUserReview = reviewsData.find(r => r.userId === user.id);
          setUserRating(currentUserRating || null);
          setUserReview(currentUserReview || null);
        }
      } catch (err: any) {
        console.error('Error loading album data:', err);
        setError('Failed to load album details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadAlbumData();
  }, [album.spotifyId, user]);

  const calculateAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    return sum / ratings.length;
  };

  const handleRatingChange = (newRating: Rating | null) => {
    if (newRating) {
      // Update or add the rating
      setRatings(prev => {
        const filtered = prev.filter(r => r.userId !== user?.id);
        return [...filtered, newRating];
      });
      setUserRating(newRating);
    } else {
      // Remove the rating
      setRatings(prev => prev.filter(r => r.userId !== user?.id));
      setUserRating(null);
    }
  };

  const handleReviewSubmit = (newReview: Review) => {
    setReviews(prev => [newReview, ...prev]);
    setUserReview(newReview);
  };

  const handleReviewUpdate = (updatedReview: Review) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
    setUserReview(updatedReview);
  };

  const handleReviewDelete = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setUserReview(null);
  };

  const formatReleaseYear = (releaseDate: string) => {
    try {
      return new Date(releaseDate).getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const averageRating = calculateAverageRating();
  
  // Use the fetched album data if available, otherwise fall back to the search result
  const displayAlbum = albumData || album;

  return (
    <Box>
      {/* Close Button */}
      {onClose && (
        <Box sx={{ mb: 2, textAlign: 'right' }}>
          <Button onClick={onClose} variant="outlined" size="small">
            Back to Search
          </Button>
        </Box>
      )}

      {/* Album Header */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, p: 3 }}>
          <Box sx={{ flex: { xs: '1', md: '0 0 300px' } }}>
            <CardMedia
              component="img"
              image={displayAlbum.imageUrl || '/placeholder-album.svg'}
              alt={`${displayAlbum.name} by ${displayAlbum.artist}`}
              sx={{ 
                width: '100%',
                maxWidth: 300,
                height: 'auto',
                aspectRatio: '1/1',
                objectFit: 'cover',
                borderRadius: 1,
                mx: 'auto',
                display: 'block',
              }}
            />
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <CardContent sx={{ p: 0 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {displayAlbum.name}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                by {displayAlbum.artist}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip 
                  icon={<CalendarIcon />}
                  label={formatReleaseYear(displayAlbum.releaseDate)}
                  variant="outlined"
                  color="primary"
                />
                
                {displayAlbum.spotifyUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    href={displayAlbum.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                  >
                    Open in Last.fm
                  </Button>
                )}
              </Box>
            </CardContent>
          </Box>
        </Box>
      </Card>

      {/* Rating Section */}
      <StarRating
        albumId={albumData?.id || ''}
        currentRating={userRating}
        onRatingChange={handleRatingChange}
        averageRating={averageRating}
        totalRatings={ratings.length}
      />

      {/* Review Form Section */}
      <ReviewForm
        albumId={albumData?.id || ''}
        existingReview={userReview}
        onReviewSubmit={handleReviewSubmit}
        onReviewUpdate={handleReviewUpdate}
        onReviewDelete={handleReviewDelete}
      />

      {/* Reviews List Section */}
      <ReviewList
        reviews={reviews}
        currentUserId={user?.id}
      />
    </Box>
  );
};