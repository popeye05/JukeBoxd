import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, Card, CardContent, CardActionArea } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/layout';
import { AuthPage, ProtectedRoute } from './components/auth';
import { AlbumSearchPage } from './components/albums';
import { UserProfilePage } from './components/social';
import { ActivityFeedPage } from './components/feed';
import { ErrorBoundary } from './components/common';
import { theme } from './theme';
import './App.css';

// Create Material-UI theme - now imported from theme.ts

// Placeholder components for routes
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <Box sx={{ 
      mt: 4, 
      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 107, 53, 0.05) 100%)',
      borderRadius: 2,
      p: 4,
      border: '1px solid rgba(255, 215, 0, 0.2)'
    }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ 
        background: 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 700,
        mb: 2
      }}>
        🎵 Welcome to JukeBoxd
      </Typography>
      <Typography variant="h6" paragraph sx={{ color: '#CCCCCC', mb: 3 }}>
        Your social network for music discovery, ratings, and reviews
      </Typography>
      
      {user ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#FFD700', fontWeight: 600 }}>
            Hello, {user.username}! 🎧
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
            Ready to discover some incredible music? Here's what you can do:
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
            gap: 3,
            mt: 3 
          }}>
            <Card sx={{ 
              backgroundColor: '#1A1A1A', 
              border: '1px solid #333333',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#FFD700',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(255, 215, 0, 0.15)',
              }
            }}>
              <CardActionArea onClick={() => navigate('/search')} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ color: '#FFD700', mb: 1, fontWeight: 600 }}>
                    🔍 Discover Albums
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Search through millions of albums and find your next favorite record
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            
            <Card sx={{ 
              backgroundColor: '#1A1A1A', 
              border: '1px solid #333333',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#FF6B35',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(255, 107, 53, 0.15)',
              }
            }}>
              <CardActionArea onClick={() => navigate('/search')} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ color: '#FF6B35', mb: 1, fontWeight: 600 }}>
                    ⭐ Rate & Review
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Share your thoughts and rate albums to help others discover great music
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            
            <Card sx={{ 
              backgroundColor: '#1A1A1A', 
              border: '1px solid #333333',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#2196F3',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(33, 150, 243, 0.15)',
              }
            }}>
              <CardActionArea onClick={() => navigate('/profile')} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ color: '#2196F3', mb: 1, fontWeight: 600 }}>
                    👥 Connect
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Follow other music lovers and see what they're listening to
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            
            <Card sx={{ 
              backgroundColor: '#1A1A1A', 
              border: '1px solid #333333',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#FFD700',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(255, 215, 0, 0.15)',
              }
            }}>
              <CardActionArea onClick={() => navigate('/feed')} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ color: '#FFD700', mb: 1, fontWeight: 600 }}>
                    📱 Your Feed
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stay updated with your friends' latest musical discoveries
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        </Box>
      ) : (
        <Box sx={{ 
          mt: 4, 
          p: 4, 
          backgroundColor: '#1A1A1A', 
          borderRadius: 2, 
          border: '1px solid #333333',
          textAlign: 'center'
        }}>
          <Typography variant="h5" sx={{ color: '#FFD700', mb: 2, fontWeight: 600 }}>
            Join the Community
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Sign in to start rating albums, following other users, and building your music profile.
          </Typography>
          <Typography variant="body2" sx={{ color: '#CCCCCC', fontStyle: 'italic' }}>
            "Music is the soundtrack of your life" - Dick Clark
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const Search = () => <AlbumSearchPage />;

const Feed = () => <ActivityFeedPage />;

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Navigation />
            
            <Container maxWidth="lg">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/search" element={<Search />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/:userId" 
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/feed" 
                  element={
                    <ProtectedRoute>
                      <Feed />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Container>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
