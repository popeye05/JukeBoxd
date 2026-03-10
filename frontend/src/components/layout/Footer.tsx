import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#0A0A0A',
        borderTop: '1px solid #333',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          Created by{' '}
          <Link
            href="https://github.com/popeye05"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#FFD700',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Popeye
          </Link>
          {' • '}
          <Link
            href="/"
            sx={{
              color: '#FFD700',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            JukeBoxd
          </Link>
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
          © {new Date().getFullYear()} JukeBoxd. Track albums you've listened to.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
