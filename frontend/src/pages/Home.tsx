import React, { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Button,
    Divider,
    Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Star } from '@mui/icons-material';

// Mock data for initial design - in a real app this would come from an API


const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [popularReviews, setPopularReviews] = useState<any[]>([]);
    const [trendingAlbums, setTrendingAlbums] = useState<any[]>([]);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Use the configured API base URL
                const apiUrl = process.env.REACT_APP_API_URL || (
                    process.env.NODE_ENV === 'production'
                        ? '/api'
                        : 'http://localhost:3001/api'
                );
                const response = await fetch(`${apiUrl}/reviews/recent?limit=6`);
                const data = await response.json();

                if (data.success) {
                    setPopularReviews(data.data.reviews);
                }
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            }
        };

        const fetchTrending = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || (
                    process.env.NODE_ENV === 'production'
                        ? '/api'
                        : 'http://localhost:3001/api'
                );
                const response = await fetch(`${apiUrl}/albums/trending?limit=10`);
                const data = await response.json();

                if (data.success && data.data.albums) {
                    setTrendingAlbums(data.data.albums);
                }
            } catch (error) {
                console.error('Failed to fetch trending albums:', error);
            }
        };

        fetchReviews();
        fetchTrending();
    }, []);

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    height: { xs: '300px', md: '400px' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    mb: 6,
                    overflow: 'hidden',
                    borderRadius: 2,
                    background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <Container maxWidth="md">
                    <Typography
                        variant="h2"
                        component="h1"
                        gutterBottom
                        sx={{
                            fontWeight: 900,
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            mb: 2,
                            fontSize: { xs: '1.5rem', sm: '2.5rem', md: '3.5rem' }
                        }}
                    >
                        Track albums you've listened to.
                        <br />
                        Save those you want to hear.
                        <br />
                        Tell your friends what's good.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={() => user ? navigate('/search') : navigate('/auth')}
                        sx={{
                            mt: 2,
                            px: { xs: 3, md: 4 },
                            py: { xs: 1, md: 1.5 },
                            fontSize: { xs: '1rem', md: '1.2rem' },
                            borderRadius: '50px'
                        }}
                    >
                        {user ? 'Start Logging' : 'Get Started - It\'s Free'}
                    </Button>
                </Container>
            </Box>

            {/* Popular Reviews Section */}
            <Box sx={{ mb: 6 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" component="h2" fontWeight="bold">
                        Popular Reviews this Week
                    </Typography>
                    <Button color="secondary" onClick={() => navigate('/feed')}>More</Button>
                </Box>

                {popularReviews.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No reviews yet. Be the first to review an album!
                    </Typography>
                ) : (
                    <Grid container spacing={3}>
                        {popularReviews.map((item) => (
                            <Grid key={item.id} size={{ xs: 12, md: 4 }}>
                                <Card 
                                    sx={{ 
                                        height: '100%', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            boxShadow: 2
                                        }
                                    }}
                                    onClick={() => navigate(`/review/${item.id}`)}
                                >
                                    <Box sx={{ display: 'flex', p: 2 }}>
                                        <CardMedia
                                            component="img"
                                            sx={{ width: 80, height: 80, borderRadius: 1 }}
                                            image={item.album.imageUrl || item.album.image_url || '/placeholder-album.svg'}
                                            alt={item.album.name}
                                        />
                                        <Box sx={{ ml: 2 }}>
                                            <Typography variant="h6" component="div" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                                {item.album.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {item.album.artist}
                                            </Typography>
                                            <Box display="flex" alignItems="center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        sx={{
                                                            fontSize: 16,
                                                            color: 'primary.main' // Simplified rating for now
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <CardContent sx={{ pt: 0, flexGrow: 1 }}>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.primary' }}>
                                            "{item.content}"
                                        </Typography>
                                        <Box display="flex" alignItems="center">
                                            <Avatar 
                                                sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}
                                                src={item.user.avatarUrl || undefined}
                                            >
                                                {item.user.username.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="caption" color="text.secondary">
                                                Review by <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{item.user.username}</Box>
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Trending Tracks Section */}
            <Box>
                <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
                    Trending Tracks on JukeBoxd
                </Typography>
                {trendingAlbums.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Loading trending tracks...
                    </Typography>
                ) : (
                    <Box sx={{ 
                        bgcolor: 'background.paper', 
                        borderRadius: 2,
                        overflow: 'hidden'
                    }}>
                        {trendingAlbums.map((album, index) => (
                            <Box
                                key={album.spotifyId}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 2,
                                    borderBottom: index < trendingAlbums.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    transition: 'background-color 0.2s',
                                    '&:hover': {
                                        bgcolor: 'action.hover'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            minWidth: '30px',
                                            color: 'text.secondary',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {index + 1}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">
                                            {album.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {album.artist}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Star />}
                                    onClick={() => navigate(`/album/${album.spotifyId}`)}
                                    sx={{ minWidth: '100px' }}
                                >
                                    Rate
                                </Button>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Home;
