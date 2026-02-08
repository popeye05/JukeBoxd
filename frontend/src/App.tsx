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

import Home from './pages/Home';
import DiscoverUsersPage from './pages/DiscoverUsersPage';

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
