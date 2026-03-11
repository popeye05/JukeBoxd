import React, { useState } from 'react';
import { Container, Box, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  useAuthRedirect(); // Handle redirect if already authenticated

  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  const handleSkip = () => {
    // Get the 'from' location if it exists
    const from = (location.state as any)?.from;
    
    // Debug logging
    console.log('=== AUTH PAGE CLOSE DEBUG ===');
    console.log('Full location state:', JSON.stringify(location.state, null, 2));
    console.log('From object:', from);
    console.log('From pathname:', from?.pathname);
    console.log('============================');
    
    // If we came from a specific page and it's not /auth or /profile (protected)
    if (from?.pathname && from.pathname !== '/auth' && from.pathname !== '/profile') {
      // Go to that page
      console.log('Navigating to:', from.pathname);
      navigate(from.pathname, { replace: true });
    } else {
      // Otherwise go home
      console.log('Navigating to home (fallback)');
      navigate('/', { replace: true });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Skip/Close button */}
        <IconButton
          onClick={handleSkip}
          sx={{
            position: 'absolute',
            top: { xs: 16, sm: 32 },
            right: { xs: 16, sm: 32 },
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            boxShadow: 2,
            zIndex: 10
          }}
          aria-label="Skip sign in"
        >
          <Close />
        </IconButton>

        {isLogin ? (
          <LoginForm onSwitchToRegister={switchToRegister} />
        ) : (
          <RegisterForm onSwitchToLogin={switchToLogin} />
        )}
      </Box>
    </Container>
  );
};

export default AuthPage;
