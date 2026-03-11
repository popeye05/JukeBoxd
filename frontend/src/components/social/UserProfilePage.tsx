import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Grid,
  Alert,
  Button,
  IconButton,
  Snackbar
} from '@mui/material';
import { ArrowBack, Share } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from './index';

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [shareSnackbar, setShareSnackbar] = useState(false);

  // If no userId provided, show current user's profile
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/profile/${profileUserId}`;
    
    if (navigator.share) {
      // Use native share if available (mobile)
      navigator.share({
        title: 'Check out my JukeBoxd profile!',
        text: 'See my music ratings and reviews on JukeBoxd',
        url: profileUrl,
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(profileUrl).then(() => {
        setShareSnackbar(true);
      });
    }
  };

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
        {/* Back button and Share button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          {!isOwnProfile && (
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          )}
          {isOwnProfile && (
            <Box sx={{ flex: 1 }} />
          )}
          <Button
            variant="outlined"
            startIcon={<Share />}
            onClick={handleShare}
          >
            Share Profile
          </Button>
        </Box>

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

      <Snackbar
        open={shareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShareSnackbar(false)}
        message="Profile link copied to clipboard!"
      />
    </Container>
  );
        </Grid>
      </Box>
    </Container>
  );
};

export default UserProfilePage;