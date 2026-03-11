import React, { useState, useEffect } from 'react';
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

  // Store the 'from' location in sessionStorage when component mounts
  useEffect(() => {
    const from = (location.state as any)?.from;
    console.log('=== AUTH PAGE MOUNT ===');
    console.log('Location state:', location.state);
    console.log('From object:', from);
    console.log('From pathname:', from?.pathname);
    
    if (from?.pathname) {
      console.log('Storing in sessionStorage:', from.pathname);
      sessionStorage.setItem('authReturnPath', from.pathname);
    } else {
      console.log('No pathname to store');
    }
    console.log('======================');
  }, [location.state]);

  const handleSkip = () => {
    // Try to get return path from sessionStorage
    const returnPath = sessionStorage.getItem('authReturnPath');
    sessionStorage.removeItem('authReturnPath'); // Clean up
    
    console.log('=== AUTH PAGE CLOSE DEBUG ===');
    console.log('Return path from storage:', returnPath);
    console.log('Location state:', location.state);
    console.log('============================');
    
    // If we have a return path and it's not a protected route
    if (returnPath && returnPath !== '/auth' && returnPath !== '/profile') {
      console.log('Navigating to stored path:', returnPath);
      navigate(returnPath, { replace: true });
    } else {
      console.log('Navigating to home');
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
