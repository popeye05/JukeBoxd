import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Grid,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from './index';
import { RatingWithDetails, ReviewWithDetails } from '../../types';
import api from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [userRatings, setUserRatings] = useState<RatingWithDetails[]>([]);
  const [userReviews, setUserReviews] = useState<ReviewWithDetails[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no userId provided, show current user's profile
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;

  useEffect(() => {
    if (!profileUserId) {
      setError('User not found');
      return;
    }

    // Reset data when user changes
    setUserRatings([]);
    setUserReviews([]);
    setError(null);
  }, [profileUserId]);

  const fetchUserRatings = async () => {
    if (!profileUserId || ratingsLoading) return;

    try {
      setRatingsLoading(true);
      const response = await api.get(`/ratings/user/${profileUserId}`);
      console.log('Ratings API response:', response.data); // Debug log
      setUserRatings(response.data.data.ratings || []);
    } catch (err: any) {
      console.error('Error fetching user ratings:', err);
      // Don't set error for ratings - just show empty state
    } finally {
      setRatingsLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    if (!profileUserId || reviewsLoading) return;

    try {
      setReviewsLoading(true);
      const response = await api.get(`/reviews/user/${profileUserId}`);
      console.log('Reviews API response:', response.data); // Debug log
      setUserReviews(response.data.data.reviews || []);
    } catch (err: any) {
      console.error('Error fetching user reviews:', err);
      // Don't set error for reviews - just show empty state
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Lazy load data when tab is selected
    if (newValue === 1 && userRatings.length === 0) {
      fetchUserRatings();
    } else if (newValue === 2 && userReviews.length === 0) {
      fetchUserReviews();
    }
  };

  if (!profileUserId) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">
            User not found. Please log in to view your profile.
          </Alert>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        {/* Back button for non-own profiles */}
        {!isOwnProfile && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
        )}

        <Grid container spacing={3}>
          {/* Profile Section */}
          <Grid size={12}>
            <UserProfile
              userId={profileUserId}
              showFollowButton={!isOwnProfile}
              compact={false}
            />
          </Grid>

          {/* Content Tabs removed as per user request to drop Rating/Review tabs and integrate into main profile */}
        </Grid>
      </Box>
    </Container>
  );
};

export default UserProfilePage;