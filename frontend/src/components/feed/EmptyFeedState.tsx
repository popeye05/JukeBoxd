import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Explore as ExploreIcon,
  MusicNote as MusicNoteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface EmptyFeedStateProps {
  userId?: string; // If provided, this is viewing someone else's empty feed
}

export const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({ userId }) => {
  const navigate = useNavigate();

  if (userId) {
    // Viewing someone else's empty feed
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 2
        }}
      >
        <MusicNoteIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          No Activity Yet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This user hasn't rated or reviewed any albums yet.
        </Typography>
      </Paper>
    );
  }

  // User's own empty feed - encourage them to follow others
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        backgroundColor: 'grey.50',
        borderRadius: 2
      }}
    >
      <PersonAddIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      
      <Typography variant="h5" gutterBottom>
        Your Feed is Empty
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
        Start following other music enthusiasts to see their ratings and reviews in your feed. 
        Discover new albums through the community!
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<ExploreIcon />}
          onClick={() => navigate('/search')}
          size="large"
        >
          Discover Albums
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={() => navigate('/profile')}
          size="large"
        >
          Find Users to Follow
        </Button>
      </Stack>

      <Box mt={4}>
        <Typography variant="body2" color="text.secondary">
          💡 Tip: Rate and review albums to help others discover great music too!
        </Typography>
      </Box>
    </Paper>
  );
};