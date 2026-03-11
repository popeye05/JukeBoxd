import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { Navigation, Footer } from './components/layout';
import { AuthPage, ProtectedRoute } from './components/auth';
import { AlbumSearchPage, AlbumDetail } from './components/albums';
import { UserProfilePage } from './components/social';
import { ActivityFeedPage } from './components/feed';
import { ErrorBoundary } from './components/common';
import { theme } from './theme';
import './App.css';

// Create Material-UI theme - now imported from theme.ts

import Home from './pages/Home';
import DiscoverUsersPage from './pages/DiscoverUsersPage';

const Search = () => <AlbumSearchPage />;

const Feed = () => <ActivityFeedPage />;

// Album detail page wrapper
const AlbumDetailPage = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || (
          process.env.NODE_ENV === 'production'
            ? '/api'
            : 'http://localhost:3001/api'
        );
        const response = await fetch(`${apiUrl}/albums/${albumId}`);
        const data = await response.json();
        
        if (data.success) {
          setAlbum(data.data.album);
        }
      } catch (error) {
        console.error('Failed to fetch album:', error);
      } finally {
        setLoading(false);
      }
    };

    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!album) {
    return (
      <Box sx={{ mt: 4 }}>
        <p>Album not found</p>
      </Box>
    );
  }

  return <AlbumDetail album={album} onClose={() => window.history.back()} />;
};

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
                <Route path="/album/:albumId" element={<AlbumDetailPage />} />
                <Route path="/discover" element={
                  <ProtectedRoute>
                    <DiscoverUsersPage />
                  </ProtectedRoute>
                } />
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
                  element={<UserProfilePage />}
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
            
            <Footer />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
