import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  useAuthRedirect(); // Handle redirect if already authenticated

  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
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