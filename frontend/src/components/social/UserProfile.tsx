import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { Person, CalendarToday, Star, RateReview } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi, UserProfileWithStats } from '../../services/socialApi';
import FollowButton from './FollowButton';

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const profileData = await socialApi.getUserProfile(userId);
        setProfile(profileData);
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.response?.data?.error?.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

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
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {profile.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{profile.username}</Typography>
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
            >
              {profile.username.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box flex={1}>
              <Typography variant="h4" component="h1" gutterBottom>
                {profile.username}
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Joined {formatDate(profile.createdAt)}
                </Typography>
              </Box>

              {showFollowButton && !isOwnProfile && (
                <FollowButton
                  userId={userId}
                  username={profile.username}
                  onFollowChange={handleFollowChange}
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Stats Section */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {profile.followersCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Followers
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {profile.followingCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Following
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {profile.ratingsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ratings
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {profile.reviewsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reviews
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Profile Type Indicator */}
          {isOwnProfile && (
            <Box>
              <Chip
                icon={<Person />}
                label="Your Profile"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserProfile;