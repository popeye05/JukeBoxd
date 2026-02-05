import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Rating,
  Link
} from '@mui/material';
import {
  Star as StarIcon,
  RateReview as ReviewIcon,
  Album as AlbumIcon
} from '@mui/icons-material';
import { Activity } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedItemProps {
  activity: Activity;
}

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ activity }) => {
  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'rating':
        return <StarIcon color="primary" />;
      case 'review':
        return <ReviewIcon color="secondary" />;
      default:
        return <AlbumIcon />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'rating':
        return 'rated';
      case 'review':
        return 'reviewed';
      default:
        return 'interacted with';
    }
  };

  const renderActivityContent = () => {
    if (activity.type === 'rating' && activity.data?.rating) {
      return (
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          <Rating
            value={activity.data.rating}
            readOnly
            size="small"
            precision={1}
          />
          <Typography variant="body2" color="text.secondary">
            ({activity.data.rating}/5 stars)
          </Typography>
        </Box>
      );
    }

    if (activity.type === 'review' && activity.data?.content) {
      return (
        <Box mt={1}>
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              backgroundColor: 'grey.50',
              padding: 1,
              borderRadius: 1,
              borderLeft: '3px solid',
              borderLeftColor: 'secondary.main'
            }}
          >
            "{activity.data.content.length > 200 
              ? `${activity.data.content.substring(0, 200)}...` 
              : activity.data.content}"
          </Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" gap={2}>
          {/* User Avatar */}
          <Avatar sx={{ width: 40, height: 40 }}>
            {activity.user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>

          {/* Main Content */}
          <Box flex={1}>
            {/* Header with user, action, and timestamp */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {activity.user?.username || 'Unknown User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getActivityText()}
              </Typography>
              <Link
                href={activity.album?.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="inherit"
              >
                <Typography variant="subtitle2" fontWeight="medium">
                  {activity.album?.name || 'Unknown Album'}
                </Typography>
              </Link>
              <Typography variant="body2" color="text.secondary">
                by {activity.album?.artist || 'Unknown Artist'}
              </Typography>
            </Box>

            {/* Activity Type Chip and Timestamp */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip
                icon={getActivityIcon()}
                label={activity.type}
                size="small"
                variant="outlined"
                color={activity.type === 'rating' ? 'primary' : 'secondary'}
              />
              <Typography variant="caption" color="text.secondary">
                {formatTimeAgo(activity.createdAt)}
              </Typography>
            </Box>

            {/* Activity Content (rating stars or review text) */}
            {renderActivityContent()}
          </Box>

          {/* Album Cover */}
          {activity.album?.imageUrl && (
            <Box>
              <img
                src={activity.album.imageUrl}
                alt={`${activity.album.name} cover`}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 4,
                  objectFit: 'cover'
                }}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};