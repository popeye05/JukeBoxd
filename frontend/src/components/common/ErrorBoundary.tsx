import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              textAlign: 'center',
              gap: 3,
            }}
          >
            <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
              </Typography>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="caption" component="pre" sx={{ 
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    padding: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 200
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Box>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;