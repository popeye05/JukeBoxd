import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Container
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { feedApi } from '../../services/feedApi';
import { Activity } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ActivityFeedItem } from './ActivityFeedItem';
import { EmptyFeedState } from './EmptyFeedState';

interface ActivityFeedProps {
  userId?: string; // If provided, shows user's public feed instead of personalized feed
  title?: string;
  showRefreshButton?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  userId,
  title,
  showRefreshButton = true
}) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const limit = 20;

  const loadFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      let response;
      if (userId) {
        // Load specific user's public feed
        response = await feedApi.getUserFeed(userId, { page: pageNum, limit });
      } else {
        // Load personalized feed for authenticated user
        response = await feedApi.getFeed({ page: pageNum, limit });
      }

      const newActivities = response.activities;
      
      if (append) {
        setActivities(prev => [...prev, ...newActivities]);
      } else {
        setActivities(newActivities);
      }

      setHasMore(response.pagination.hasMore);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError(err.response?.data?.error?.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, limit]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeed(page + 1, true);
    }
  };

  useEffect(() => {
    if (user || userId) {
      loadFeed();
    }
  }, [user, userId, loadFeed]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={() => loadFeed()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (activities.length === 0) {
    return <EmptyFeedState userId={userId} />;
  }

  return (
    <Container maxWidth="md">
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            {title || (userId ? 'User Activity' : 'Activity Feed')}
          </Typography>
          {showRefreshButton && (
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outlined"
              size="small"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </Box>

        {/* Activity List */}
        <Box>
          {activities.map((activity, index) => (
            <Box key={activity.id}>
              <ActivityFeedItem activity={activity} />
              {index < activities.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          ))}
        </Box>

        {/* Load More Button */}
        {hasMore && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loadingMore}
              size="large"
            >
              {loadingMore ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </Box>
        )}

        {/* End of Feed Message */}
        {!hasMore && activities.length > 0 && (
          <Box textAlign="center" mt={4} mb={2}>
            <Typography variant="body2" color="text.secondary">
              You've reached the end of the feed
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};