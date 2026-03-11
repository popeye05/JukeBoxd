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
    // Go back to where they came from, or home if no previous location
    const from = (location.state as any)?.from?.pathname || '/';
    navigate(from);
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
