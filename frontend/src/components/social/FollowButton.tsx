import React, { useState, useEffect } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { PersonAdd, PersonRemove } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi } from '../../services/socialApi';

interface FollowButtonProps {
  userId: string;
  username: string;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  username,
  onFollowChange,
  size = 'medium',
  variant = 'contained'
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Don't show follow button for own profile
  if (!user || user.id === userId) {
    return null;
  }

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        setCheckingStatus(true);
        const following = await socialApi.isFollowing(userId);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkFollowStatus();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (loading) return;

    try {
      setLoading(true);
      
      if (isFollowing) {
        await socialApi.unfollowUser(userId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await socialApi.followUser(userId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error: any) {
      console.error('Error toggling follow status:', error);
      // You might want to show a toast notification here
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        startIcon={<CircularProgress size={16} />}
      >
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      color={isFollowing ? 'secondary' : 'primary'}
      onClick={handleFollowToggle}
      disabled={loading}
      startIcon={
        loading ? (
          <CircularProgress size={16} />
        ) : isFollowing ? (
          <PersonRemove />
        ) : (
          <PersonAdd />
        )
      }
    >
      {loading
        ? 'Loading...'
        : isFollowing
        ? `Unfollow ${username}`
        : `Follow ${username}`
      }
    </Button>
  );
};

export default FollowButton;