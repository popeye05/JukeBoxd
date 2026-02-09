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
    Avatar,
    Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Star } from '@mui/icons-material';

// Mock data for initial design - in a real app this would come from an API


const TRENDING_ALBUMS = [
    { id: 1, title: "Midnights", artist: "Taylor Swift", cover: "https://upload.wikimedia.org/wikipedia/en/9/9f/Midnights_-_Taylor_Swift.png" },
    { id: 2, title: "SOS", artist: "SZA", cover: "https://upload.wikimedia.org/wikipedia/en/2/2c/SZA_-_S.O.S.png" },
    { id: 3, title: "Renaissance", artist: "Beyoncé", cover: "https://upload.wikimedia.org/wikipedia/en/2/2e/Renaissance_by_Beyonc%C3%A9.png" },
    { id: 4, title: "Un Verano Sin Ti", artist: "Bad Bunny", cover: "https://upload.wikimedia.org/wikipedia/en/6/60/Bad_Bunny_-_Un_Verano_Sin_Ti.png" },
];

const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const [popularReviews, setPopularReviews] = useState<any[]>([]);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Determine API URL based on environment (handling port difference)
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiUrl}/reviews/recent?limit=6`);
                const data = await response.json();

                if (data.success) {
                    setPopularReviews(data.data.reviews);
                }
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            }
        };

        fetchReviews();
    }, []);

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    height: '400px',
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
                            mb: 2
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
                            px: 4,
                            py: 1.5,
                            fontSize: '1.2rem',
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
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ display: 'flex', p: 2 }}>
                                        <CardMedia
                                            component="img"
                                            sx={{ width: 80, height: 80, borderRadius: 1 }}
                                            image={item.album.imageUrl || item.album.image_url || 'https://via.placeholder.com/150'}
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
                                            <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}>
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

            {/* Trending Albums Section */}
            <Box>
                <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
                    Trending on JukeBoxd
                </Typography>
                <Grid container spacing={2}>
                    {TRENDING_ALBUMS.map((album) => (
                        <Grid key={album.id} size={{ xs: 6, sm: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: 2,
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(1.02)' },
                                    cursor: 'pointer'
                                }}
                                onClick={() => navigate('/search')}
                            >
                                <Box
                                    component="img"
                                    src={album.cover}
                                    alt={album.title}
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                        aspectRatio: '1/1'
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                        p: 2,
                                        pt: 6
                                    }}
                                >
                                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                        {album.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {album.artist}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Box>
    );
};

export default Home;
