import React from 'react';
import { Box, Typography } from '@mui/material';
import { ActivityFeed } from './ActivityFeed';

export const ActivityFeedPage: React.FC = () => {
  return (
    <Box sx={{ mt: 4 }}>
      <ActivityFeed 
        title="Your Activity Feed"
        showRefreshButton={true}
      />
    </Box>
  );
};