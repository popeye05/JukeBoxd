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

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
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
    setError(null);
  }, [profileUserId]);

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