import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import { ArrowBack, Star, RateReview } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile, UserDiscovery } from './index';
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

          {/* Content Tabs */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label="profile content tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Discover Users" />
                  <Tab label={`Ratings (${userRatings.length})`} />
                  <Tab label={`Reviews (${userReviews.length})`} />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  <UserDiscovery
                    title="Discover New Users"
                    limit={6}
                    showRefresh={true}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  {ratingsLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : userRatings.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <Star sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {isOwnProfile ? 'No ratings yet' : 'No ratings from this user'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile 
                          ? 'Start rating albums to build your music profile!'
                          : 'This user hasn\'t rated any albums yet.'
                        }
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {userRatings.map((rating) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rating.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" noWrap title={rating.album?.name}>
                                {rating.album?.name || 'Unknown Album'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                by {rating.album?.artist || 'Unknown Artist'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Star sx={{ color: '#FFD700', fontSize: 20 }} />
                                <Typography variant="body1" fontWeight="bold">
                                  {rating.rating}/5
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(rating.createdAt).toLocaleDateString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  {reviewsLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : userReviews.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <RateReview sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {isOwnProfile ? 'No reviews yet' : 'No reviews from this user'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile 
                          ? 'Start reviewing albums to share your thoughts!'
                          : 'This user hasn\'t written any reviews yet.'
                        }
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {userReviews.map((review) => (
                        <Grid size={12} key={review.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {review.album?.name || 'Unknown Album'}
                              </Typography>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                by {review.album?.artist || 'Unknown Artist'}
                              </Typography>
                              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                                {review.content}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default UserProfilePage;