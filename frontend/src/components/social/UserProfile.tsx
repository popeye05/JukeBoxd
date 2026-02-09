import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  CardMedia,
  Button
} from '@mui/material';
import { CalendarToday, Star, RateReview } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi } from '../../services/socialApi';
import { reviewService } from '../../services/reviewService';
import { ratingService } from '../../services/ratingService';
import { UserProfileWithStats, ReviewWithDetails, RatingWithDetails } from '../../types';
import FollowButton from './FollowButton';
import SocialStats from './SocialStats';
import EditProfileDialog from './EditProfileDialog';
import { Edit } from '@mui/icons-material';

interface UserProfileProps {
  userId: string;
  showFollowButton?: boolean;
  compact?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  showFollowButton = true,
  compact = false
}) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [ratings, setRatings] = useState<RatingWithDetails[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);

  const handleProfileUpdate = (updatedProfile: UserProfileWithStats) => {
    setProfile((prev: UserProfileWithStats | null) => prev ? { ...prev, ...updatedProfile } : null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch profile, reviews, and ratings in parallel
        const [profileData, reviewsData, ratingsData] = await Promise.all([
          socialApi.getUserProfile(userId),
          reviewService.getUserReviews(userId),
          ratingService.getUserRatings(userId)
        ]);

        setProfile(profileData);
        setReviews(reviewsData as ReviewWithDetails[]);
        setRatings(ratingsData as RatingWithDetails[]);
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.error?.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFollowChange = (isFollowing: boolean) => {
    if (profile) {
      setProfile({
        ...profile,
        followersCount: profile.followersCount + (isFollowing ? 1 : -1)
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            {error || 'User profile not found'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  if (compact) {
    // ... compact view code ...
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main', src: profile.avatarUrl }}>
              {profile.displayName?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{profile.displayName || profile.username}</Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.followersCount} followers • {profile.followingCount} following
              </Typography>
            </Box>
            {showFollowButton && !isOwnProfile && (
              <FollowButton
                userId={userId}
                username={profile.username}
                onFollowChange={handleFollowChange}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Profile Card */}
      <Card>
        <CardContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Header Section */}
            <Box display="flex" alignItems="center" gap={3}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
                src={profile.avatarUrl || undefined}
              >
                {profile.displayName?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()}
              </Avatar>

              <Box flex={1}>
                {/* Name and Handle */}
                <Typography variant="h4" component="h1">
                  {profile.displayName || profile.username}
                </Typography>
                {profile.displayName && (
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    @{profile.username}
                  </Typography>
                )}

                {/* Bio */}
                {profile.bio && (
                  <Typography variant="body1" sx={{ mt: 1, mb: 1 }}>
                    {profile.bio}
                  </Typography>
                )}

                <Box display="flex" alignItems="center" gap={1} mb={2} mt={1}>
                  <CalendarToday fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Joined {formatDate(profile.createdAt)}
                  </Typography>
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  {showFollowButton && !isOwnProfile && (
                    <FollowButton
                      userId={userId}
                      username={profile.username}
                      onFollowChange={handleFollowChange}
                    />
                  )}
                  {isOwnProfile && (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Stats Section - Followers/Following */}
            <Box>
              <SocialStats
                userId={userId}
                followersCount={profile.followersCount}
                followingCount={profile.followingCount}
                onCountsChange={(newFollowers, newFollowing) => {
                  setProfile((prev: UserProfileWithStats | null) => prev ? ({
                    ...prev,
                    followersCount: newFollowers,
                    followingCount: newFollowing
                  }) : null);
                }}
              />
            </Box>

            {/* Stats Section - Ratings/Reviews Counts (Restored) */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {profile.reviewsCount || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    <RateReview color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Reviews
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {profile.ratingsCount || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    <Star color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Ratings
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Lower Section - Recent Activity */}
      <Grid container spacing={3}>
        {/* Recent Reviews */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <RateReview color="action" />
                  <Typography variant="h6">Recent Reviews</Typography>
                </Box>
                {reviews.length > 3 && (
                  <Button size="small" onClick={() => setShowAllReviews(!showAllReviews)}>
                    {showAllReviews ? 'Show Less' : 'See All'}
                  </Button>
                )}
              </Box>

              {reviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                  No reviews yet.
                </Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                    <Card key={review.id} variant="outlined">
                      <Box sx={{ display: 'flex', position: 'relative' }}>
                        {review.album && (
                          <CardMedia
                            component="img"
                            sx={{ width: 80, objectFit: 'cover' }}
                            image={review.album.imageUrl || 'https://via.placeholder.com/150'}
                            alt={review.album.name}
                          />
                        )}
                        <CardContent sx={{ flex: '1 0 auto', py: 1, '&:last-child': { pb: 1 } }}>
                          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 200 }}>
                            {review.album?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            {review.album?.artist}
                          </Typography>
                          <Typography variant="body2" sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.875rem'
                          }}>
                            {review.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Ratings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Star color="action" />
                  <Typography variant="h6">Recent Ratings</Typography>
                </Box>
                {ratings.length > 6 && (
                  <Button size="small" onClick={() => setShowAllRatings(!showAllRatings)}>
                    {showAllRatings ? 'Show Less' : 'See All'}
                  </Button>
                )}
              </Box>

              {ratings.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                  No ratings yet.
                </Typography>
              ) : (
                <Grid container spacing={1}>
                  {(showAllRatings ? ratings : ratings.slice(0, 6)).map((rating) => (
                    <Grid size={{ xs: 4, sm: 4 }} key={rating.id}>
                      <Card variant="outlined" sx={{ position: 'relative' }}>
                        <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                          {rating.album && (
                            <CardMedia
                              component="img"
                              image={rating.album.imageUrl || 'https://via.placeholder.com/150'}
                              alt={rating.album.name}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.7)',
                              p: 0.5,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            <Star sx={{ fontSize: 12, color: 'primary.main' }} />
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {rating.rating}
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isOwnProfile && profile && (
        <EditProfileDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          currentUser={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </Box>
  );
};

export default UserProfile;