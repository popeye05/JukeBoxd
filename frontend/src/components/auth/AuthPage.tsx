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
    // If we have a 'from' location in state, go there
    // Otherwise go to home to avoid redirect loops
    const fromLocation = (location.state as any)?.from;
    console.log('Auth page state:', location.state);
    console.log('From location:', fromLocation);
    
    if (fromLocation?.pathname && fromLocation.pathname !== '/auth') {
      console.log('Navigating to:', fromLocation.pathname);
      navigate(fromLocation.pathname, { replace: true });
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
