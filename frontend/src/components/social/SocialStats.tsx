import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import { People } from '@mui/icons-material';
import { User } from '../../types';
import { socialApi } from '../../services/socialApi';
import FollowButton from './FollowButton';

interface SocialStatsProps {
  userId: string;
  followersCount: number;
  followingCount: number;
  onCountsChange?: (followers: number, following: number) => void;
}

interface UserListDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  users: User[];
  loading: boolean;
  error: string | null;
  showFollowButtons?: boolean;
}

const UserListDialog: React.FC<UserListDialogProps> = ({
  open,
  onClose,
  title,
  users,
  loading,
  error,
  showFollowButtons = false
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {users.length === 0 ? (
          <Box textAlign="center" py={4}>
            <People sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {title.includes('Followers') ? 'No followers yet' : 'Not following anyone yet'}
            </Typography>
          </Box>
        ) : (
          <List>
            {users.map((user) => (
              <ListItem
                key={user.id}
                onClick={() => {
                  navigate(`/profile/${user.id}`);
                  onClose();
                }}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
                secondaryAction={
                  showFollowButtons && (
                    <FollowButton
                      userId={user.id}
                      username={user.username}
                      size="small"
                      variant="outlined"
                    />
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ bgcolor: 'primary.main' }}
                    src={user.avatarUrl || undefined}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.username}
                  secondary={`Joined ${new Date(user.createdAt).toLocaleDateString()}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const SocialStats: React.FC<SocialStatsProps> = ({
  userId,
  followersCount,
  followingCount,
  onCountsChange
}) => {
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);

  const fetchFollowers = async () => {
    try {
      setFollowersLoading(true);
      setFollowersError(null);
      const response = await socialApi.getFollowers(userId);
      setFollowers(response.followers);
    } catch (err: any) {
      console.error('Error fetching followers:', err);
      setFollowersError(err.response?.data?.error?.message || 'Failed to load followers');
    } finally {
      setFollowersLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      setFollowingLoading(true);
      setFollowingError(null);
      const response = await socialApi.getFollowing(userId);
      setFollowing(response.following);
    } catch (err: any) {
      console.error('Error fetching following:', err);
      setFollowingError(err.response?.data?.error?.message || 'Failed to load following');
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleFollowersClick = () => {
    setFollowersOpen(true);
    if (followers.length === 0) {
      fetchFollowers();
    }
  };

  const handleFollowingClick = () => {
    setFollowingOpen(true);
    if (following.length === 0) {
      fetchFollowing();
    }
  };

  return (
    <>
      <Box display="flex" gap={4} justifyContent="center">
        <Button
          variant="text"
          onClick={handleFollowersClick}
          sx={{ 
            textTransform: 'none', 
            p: 1,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 215, 0, 0.08)'
            }
          }}
        >
          <Box textAlign="center">
            <Typography 
              variant="h5" 
              color="primary" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                lineHeight: 1.2
              }}
            >
              {followersCount.toLocaleString()}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mt: 0.25
              }}
            >
              Followers
            </Typography>
          </Box>
        </Button>

        <Box 
          sx={{ 
            width: '1px', 
            bgcolor: 'divider', 
            mx: 1,
            alignSelf: 'stretch'
          }} 
        />

        <Button
          variant="text"
          onClick={handleFollowingClick}
          sx={{ 
            textTransform: 'none', 
            p: 1,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 215, 0, 0.08)'
            }
          }}
        >
          <Box textAlign="center">
            <Typography 
              variant="h5" 
              color="primary" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                lineHeight: 1.2
              }}
            >
              {followingCount.toLocaleString()}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mt: 0.25
              }}
            >
              Following
            </Typography>
          </Box>
        </Button>
      </Box>

      <UserListDialog
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        title={`Followers (${followersCount})`}
        users={followers}
        loading={followersLoading}
        error={followersError}
        showFollowButtons={false}
      />

      <UserListDialog
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title={`Following (${followingCount})`}
        users={following}
        loading={followingLoading}
        error={followingError}
        showFollowButtons={false}
      />
    </>
  );
};

export default SocialStats;