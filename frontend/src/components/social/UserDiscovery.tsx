import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Refresh, People } from '@mui/icons-material';
import { User } from '../../types';
import { socialApi } from '../../services/socialApi';
import UserProfile from './UserProfile';

interface UserDiscoveryProps {
  title?: string;
  limit?: number;
  showRefresh?: boolean;
}

const UserDiscovery: React.FC<UserDiscoveryProps> = ({
  title = 'Discover Users',
  limit = 6,
  showRefresh = true
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const suggestions = await socialApi.getUserSuggestions(limit);
      setUsers(suggestions);
    } catch (err: any) {
      console.error('Error fetching user suggestions:', err);
      setError(err.response?.data?.error?.message || 'Failed to load user suggestions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [limit]);

  const handleRefresh = () => {
    fetchUsers(true);
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

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <People sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No users to discover
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              It looks like you've already connected with everyone!
            </Typography>
            {showRefresh && (
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
          {showRefresh && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </Box>

        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
              <UserProfile
                userId={user.id}
                showFollowButton={true}
                compact={true}
              />
            </Grid>
          ))}
        </Grid>

        {users.length >= limit && (
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {users.length} users. Follow some users to see more personalized suggestions!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UserDiscovery;