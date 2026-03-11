import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar
} from '@mui/material';
import { 
  ArrowBack, 
  Favorite, 
  FavoriteBorder, 
  Comment, 
  Share,
  Send
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface ReviewData {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  album: {
    id: string;
    name: string;
    artist: string;
    imageUrl: string;
    spotifyId: string;
  };
}

interface CommentData {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

const ReviewPage = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Like state
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  
  // Comment state
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentingInProgress, setCommentingInProgress] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Share state
  const [shareMessage, setShareMessage] = useState('');
  const [showShareMessage, setShowShareMessage] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
  );

  useEffect(() => {
    const fetchReview = async () => {
      if (!reviewId) {
        setError('Review ID is required');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${apiUrl}/reviews/${reviewId}`, { headers });
        const data = await response.json();
        
        if (data.success) {
          setReview(data.data.review);
          setLikeCount(data.data.likeCount || 0);
          setCommentCount(data.data.commentCount || 0);
          setHasLiked(data.data.hasLiked || false);
        } else {
          setError('Review not found');
        }
      } catch (err) {
        console.error('Failed to fetch review:', err);
        setError('Failed to load review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, apiUrl]);

  // Auto-fetch comments when comment section is shown and there are comments
  useEffect(() => {
    if (showComments && commentCount > 0) {
      fetchComments();
    }
  }, [showComments, commentCount]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLike = async () => {
    if (!user || !reviewId || likingInProgress) return;

    setLikingInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setHasLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      } else {
        console.error('Failed to like review:', data.error);
        setShareMessage('Failed to like review');
        setShowShareMessage(true);
      }
    } catch (err) {
      console.error('Failed to like review:', err);
      setShareMessage('Failed to like review');
      setShowShareMessage(true);
    } finally {
      setLikingInProgress(false);
    }
  };

  const fetchComments = async () => {
    if (!reviewId) return;

    try {
      const response = await fetch(`${apiUrl}/reviews/${reviewId}/comments`);
      const data = await response.json();
      
      if (data.success) {
        setComments(data.data.comments);
        setCommentCount(data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleComment = async () => {
    if (!user || !reviewId || !newComment.trim() || commentingInProgress) return;

    setCommentingInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setNewComment('');
        // Refresh comments to get the latest list
        await fetchComments();
        setShareMessage('Comment added successfully!');
        setShowShareMessage(true);
      } else {
        console.error('Failed to add comment:', data.error);
        setShareMessage('Failed to add comment');
        setShowShareMessage(true);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setShareMessage('Failed to add comment');
      setShowShareMessage(true);
    } finally {
      setCommentingInProgress(false);
    }
  };

  const handleShare = async () => {
    if (!review) return;

    const reviewUrl = `${window.location.origin}/review/${reviewId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${review.user?.username}'s review of ${review.album?.name}`,
          text: review.content,
          url: reviewUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(reviewUrl);
        setShareMessage('Link copied to clipboard!');
        setShowShareMessage(true);
      } catch (err) {
        console.error('Failed to copy link:', err);
        setShareMessage('Failed to copy link');
        setShowShareMessage(true);
      }
    }
  };

  const toggleComments = () => {
    const newShowComments = !showComments;
    setShowComments(newShowComments);
    
    // Always fetch comments when opening the section to ensure we have the latest
    if (newShowComments) {
      fetchComments();
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !review) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert severity="error">{error || 'Review not found'}</Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mt={4}>
        {/* Header with back button */}
        <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>

        {/* Review Card */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Album Cover */}
            <CardMedia
              component="img"
              sx={{ 
                width: { xs: '100%', md: 300 },
                height: { xs: 300, md: 300 },
                objectFit: 'cover'
              }}
              image={review.album.imageUrl || '/placeholder-album.svg'}
              alt={review.album.name}
            />
            
            {/* Review Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                {/* Album Info */}
                <Typography variant="h4" component="h1" gutterBottom>
                  {review.album.name}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  by {review.album.artist}
                </Typography>
                
                {/* User Info */}
                <Box display="flex" alignItems="center" gap={2} mt={3} mb={3}>
                  <Avatar 
                    sx={{ bgcolor: 'primary.main' }}
                    src={review.user.avatarUrl || undefined}
                  >
                    {review.user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${review.user.id}`)}
                    >
                      {review.user.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(review.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {/* Review Content */}
                <Typography variant="body1" sx={{ 
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {review.content}
                </Typography>
              </CardContent>
            </Box>
          </Box>
        </Card>

        {/* Action Buttons */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-around" alignItems="center">
              {/* Like Button */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <IconButton 
                  onClick={handleLike}
                  disabled={!user || likingInProgress}
                  color={hasLiked ? 'error' : 'default'}
                  size="large"
                >
                  {hasLiked ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Typography>
              </Box>

              {/* Comment Button */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <IconButton 
                  onClick={toggleComments}
                  size="large"
                >
                  <Comment />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </Typography>
              </Box>

              {/* Share Button */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <IconButton 
                  onClick={handleShare}
                  size="large"
                >
                  <Share />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  Share
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Comments Section */}
        {showComments && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comments
              </Typography>
              
              {/* Add Comment Form */}
              {user && (
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" gap={2} alignItems="flex-start">
                    <Avatar 
                      sx={{ bgcolor: 'primary.main' }}
                      src={user.avatarUrl || undefined}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <Box display="flex" justifyContent="flex-end" mt={1}>
                        <Button
                          onClick={handleComment}
                          disabled={!newComment.trim() || commentingInProgress}
                          startIcon={commentingInProgress ? <CircularProgress size={16} /> : <Send />}
                          size="small"
                        >
                          Comment
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Comments List */}
              {comments.length > 0 ? (
                <List>
                  {comments.map((comment, index) => (
                    <Box key={comment.id}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ bgcolor: 'primary.main' }}
                            src={comment.user.avatarUrl || undefined}
                          >
                            {comment.user.username.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography 
                                variant="subtitle2"
                                sx={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/profile/${comment.user.id}`)}
                              >
                                {comment.user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(comment.createdAt)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                              {comment.content}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No comments yet. Be the first to comment!
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={() => navigate(`/album/${review.album.spotifyId}`)}
          >
            View Album
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/profile/${review.user.id}`)}
          >
            View Profile
          </Button>
        </Box>

        {/* Share Success Message */}
        <Snackbar
          open={showShareMessage}
          autoHideDuration={3000}
          onClose={() => setShowShareMessage(false)}
          message={shareMessage}
        />
      </Box>
    </Container>
  );
};

export default ReviewPage;