import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Wifi, WifiOff, Refresh } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { testConnection } from '../../utils/connectionTest';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    latency?: number;
    error?: string;
  }>({ tested: false, success: false });
  const [testingConnection, setTestingConnection] = useState(false);
  const { login } = useAuth();

  const handleConnectionTest = async () => {
    setTestingConnection(true);
    try {
      const result = await testConnection();
      setConnectionStatus({
        tested: true,
        success: result.success,
        latency: result.latency,
        error: result.error
      });
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        error: err.message
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login with:', { usernameOrEmail: usernameOrEmail.trim(), passwordLength: password.length });
      await login(usernameOrEmail.trim(), password);
      console.log('Login successful!');
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.error?.message || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign In
        </Typography>

        {/* Connection Status */}
        <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={2}>
          <Chip
            icon={
              testingConnection ? (
                <CircularProgress size={16} />
              ) : connectionStatus.success ? (
                <Wifi />
              ) : connectionStatus.tested ? (
                <WifiOff />
              ) : (
                <Wifi />
              )
            }
            label={
              testingConnection
                ? 'Testing...'
                : connectionStatus.tested
                ? connectionStatus.success
                  ? `Connected ${connectionStatus.latency ? `(${connectionStatus.latency}ms)` : ''}`
                  : 'Connection Failed'
                : 'Connection Status'
            }
            color={
              connectionStatus.tested
                ? connectionStatus.success
                  ? 'success'
                  : 'error'
                : 'default'
            }
            size="small"
          />
          <Tooltip title="Test connection to server">
            <IconButton
              size="small"
              onClick={handleConnectionTest}
              disabled={testingConnection}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {connectionStatus.tested && !connectionStatus.success && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Connection issue: {connectionStatus.error}
            <br />
            <small>Try refreshing the page or check your internet connection.</small>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="username"
            autoFocus
            disabled={loading}
            placeholder="Enter your username or email"
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>

          {onSwitchToRegister && (
            <Box textAlign="center">
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onSwitchToRegister}
                  sx={{ textDecoration: 'none' }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LoginForm;